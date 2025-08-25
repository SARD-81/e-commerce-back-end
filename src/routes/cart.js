import { Router } from "express";
 import { prisma } from "../prisma.js";import { requireAuth } from "../middleware/auth.js";
 import { z } from "zod";
 const router = Router();
 router.use(requireAuth);
 router.get("/", async (req, res) => {
 const items = await prisma.cartItem.findMany({
 where: { userId: req.user.id },
 include: { product: true },
 });
 res.json(items);
 });
 const addSchema = z.object({ productId: z.number().int(), quantity:
 z.number().int().min(1).default(1) });
 router.post("/", async (req, res) => {
 try {
 const { productId, quantity } = addSchema.parse(req.body);
 // upsert cart item
 const item = await prisma.cartItem.upsert({
 where: { userId_productId: { userId: req.user.id, productId } },
 update: { quantity: { increment: quantity } },
 create: { userId: req.user.id, productId, quantity },
 });
 res.status(201).json(item);
 } catch (e) {
 res.status(400).json({ error: e.message });
 }
 });
 router.put("/:productId", async (req, res) => {
 const productId = Number(req.params.productId);
 const quantity = Number(req.body.quantity);
 if (!Number.isInteger(quantity) || quantity < 1) return
 res.status(400).json({ error: "quantity must be >=1" });
 const item = await prisma.cartItem.update({
 where: { userId_productId: { userId: req.user.id, productId } },
 data: { quantity },
 });
 res.json(item);
 });
 router.delete("/:productId", async (req, res) => {
 const productId = Number(req.params.productId);
 await prisma.cartItem.delete({ where: { userId_productId: { userId:
 req.user.id, productId } } });res.json({ ok: true });
});
router.delete("/", async (req, res) => {
await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
res.json({ ok: true });
});
export default router;