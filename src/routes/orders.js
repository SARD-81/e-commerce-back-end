import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
const router = Router();
// Create order from current cart
router.post("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const cart = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
  });
  if (!cart.length) return res.status(400).json({ error: "Cart is empty" });
  // transaction: check stock, decrement, create order + items, clear cart
  const order = await prisma.$transaction(async (tx) => {
    // verify stock
    for (const item of cart) {
      if (item.product.stock < item.quantity) {
        throw new Error(`Out of stock: ${item.product.title}`);
      }
    }
    // decrement stock
    for (const item of cart) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }
    const total = cart.reduce(
      (sum, it) => sum + Number(it.product.price) * it.quantity,
      0
    );
    const created = await tx.order.create({
      data: { userId, status: "PENDING", total },
    });
    for (const item of cart) {
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        },
      });
    }
    // clear cart
    await tx.cartItem.deleteMany({ where: { userId } });
    return created;
  });
  res.status(201).json({ orderId: order.id });
});
// My orders
router.get("/", requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  res.json(orders);
});
// Admin: list all
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: { select: { id: true, email: true } } },
  });
  res.json(orders);
});
// Admin: update status
router.patch("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
    },
  });
  res.json(updated);
});
export default router;
