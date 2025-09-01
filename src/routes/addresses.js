import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { userAddressSchema } from "../models/user_address.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const addresses = await prisma.userAddress.findMany({
    where: { userId: req.user.id },
    orderBy: { id: "asc" },
  });
  res.json(addresses);
});

router.post("/", async (req, res) => {
  try {
    const data = userAddressSchema.parse(req.body);
    const address = await prisma.userAddress.create({
      data: { ...data, userId: req.user.id },
    });
    res.status(201).json(address);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const data = userAddressSchema.parse(req.body);
    const existing = await prisma.userAddress.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: "Address not found" });
    const address = await prisma.userAddress.update({
      where: { id },
      data,
    });
    res.json(address);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.userAddress.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: "Address not found" });
  await prisma.userAddress.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
