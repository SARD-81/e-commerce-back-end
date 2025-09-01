import { Router } from "express";
 import { prisma } from "../prisma.js";
 import { requireAdmin } from "../middleware/auth.js";
 import { z } from "zod";
 const router = Router();
 router.get("/", async (req, res) => {
 const { q, categoryId, minPrice, maxPrice, sortBy = "createdAt", sortOrder =
 "desc", page = 1, limit = 12 } = req.query;
 const where = {};
 if (q) where.OR = [{ title: { contains: String(q), mode: "insensitive" } }, {
 description: { contains: String(q), mode: "insensitive" } }];
 if (categoryId) where.categoryId = Number(categoryId);
 if (minPrice || maxPrice) where.price = { gte: minPrice ? Number(minPrice) :
 undefined, lte: maxPrice ? Number(maxPrice) : undefined };
 const skip = (Number(page)- 1) * Number(limit);
 const [items, total] = await Promise.all([
 prisma.product.findMany({ where, skip, take: Number(limit), orderBy: {
 [sortBy]: sortOrder } }),
 prisma.product.count({ where })
 ]);
 res.json({ items, total, page: Number(page), pages: Math.ceil(total /
 Number(limit)) });
 });
 router.get("/:id", async (req, res) => {
 const id = Number(req.params.id);
 const product = await prisma.product.findUnique({
 where: { id },
 include: {
 reviews: {
 include: { user: { select: { id: true, name: true } } },
 orderBy: { createdAt: "desc" }
 }
 }
 });
 if (!product) return res.status(404).json({ error: "Not found" });
 const averageRating = product.reviews.length
 ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
 : null;
 res.json({ ...product, averageRating });
 });
 const createSchema = z.object({
 title: z.string().min(1),description: z.string().optional(),
 price: z.number().positive(),
 stock: z.number().int().nonnegative().default(0),
 categoryId: z.number().int().optional(),
 imageUrl: z.string().url().optional(),
 });
 router.post("/", requireAdmin, async (req, res) => {
 try {
 const data = createSchema.parse(req.body);
 const product = await prisma.product.create({ data });
 res.status(201).json(product);
 } catch (e) {
 res.status(400).json({ error: e.message });
 }
 });
 router.put("/:id", requireAdmin, async (req, res) => {
 const id = Number(req.params.id);
 try {
 const data = createSchema.partial().parse(req.body);
 const product = await prisma.product.update({ where: { id }, data });
 res.json(product);
 } catch (e) {
 res.status(400).json({ error: e.message });
 }
 });
 router.delete("/:id", requireAdmin, async (req, res) => {
 const id = Number(req.params.id);
 await prisma.product.delete({ where: { id } });
 res.json({ ok: true });
 });
 export default router;