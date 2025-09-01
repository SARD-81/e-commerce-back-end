import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// list reviews for a product
router.get("/product/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

const createSchema = z.object({
  productId: z.number().int(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { productId, rating, comment } = createSchema.parse(req.body);
    const review = await prisma.review.create({
      data: {
        productId,
        rating,
        comment: comment || null,
        userId: req.user.id,
      },
    });
    res.status(201).json(review);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const updateSchema = createSchema.pick({ rating: true, comment: true }).partial();

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const review = await prisma.review.update({ where: { id }, data });
    res.json(review);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.userId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await prisma.review.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
