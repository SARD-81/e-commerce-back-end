import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing)
      return res.status(409).json({ error: "Email already registered" });
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name || null,
        password: await bcrypt.hash(data.password, 10),
      },
    });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt = new Date(
      Date.now() + parseTTL(process.env.REFRESH_TOKEN_TTL || "30d")
    );
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt = new Date(
      Date.now() + parseTTL(process.env.REFRESH_TOKEN_TTL || "30d")
    );
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ error: "MissingrefreshToken" });
    const saved = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!saved || saved.revoked || saved.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    const payload = verifyRefreshToken(refreshToken); // throws if invalid
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: "User not found" });
    // rotate token: revoke old, issue new
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: {
        revoked: true,
      },
    });
    const newRefresh = signRefreshToken(user);
    const expiresAt = new Date(
      Date.now() + parseTTL(process.env.REFRESH_TOKEN_TTL || "30d")
    );
    await prisma.refreshToken.create({
      data: { token: newRefresh, userId: user.id, expiresAt },
    });
    const accessToken = signAccessToken(user);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (e) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }
  res.json({ ok: true });
});
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json({ user });
});
function parseTTL(ttl) {
  // supports "15m", "30d", numbers as ms
  if (/^\d+$/.test(ttl)) return Number(ttl);
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 0;
  const n = Number(m[1]);
  return { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] * n;
}
export default router;
