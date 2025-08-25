import { Router } from "express";
 import { prisma } from "../prisma.js";
 import { requireAdmin } from "../middleware/auth.js";
 import { z } from "zod";
 import { slugify } from "../utils/slugify.js";const router = Router();
 router.get("/", async (req, res) => {
 const items = await prisma.category.findMany({ orderBy: { name: "asc" } });
 res.json(items);
 });
 const schema = z.object({ name: z.string().min(1) });
 router.post("/", requireAdmin, async (req, res) => {
 try {
 const { name } = schema.parse(req.body);
 const cat = await prisma.category.create({ data: { name, slug:
 slugify(name) } });
 res.status(201).json(cat);
 } catch (e) {
 res.status(400).json({ error: e.message });
 }
 });
 router.put("/:id", requireAdmin, async (req, res) => {
 try {
 const id = Number(req.params.id);
 const { name } = schema.parse(req.body);
 const cat = await prisma.category.update({ where: { id }, data: { name,
 slug: slugify(name) } });
 res.json(cat);
 } catch (e) {
 res.status(400).json({ error: e.message });
 }
 });
 router.delete("/:id", requireAdmin, async (req, res) => {
 const id = Number(req.params.id);
 await prisma.category.delete({ where: { id } });
 res.json({ ok: true });
 });
 export default router;