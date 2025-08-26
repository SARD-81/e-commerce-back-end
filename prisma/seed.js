import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/utils/slugify.js";

const prisma = new PrismaClient();

async function main() {
  // --- 1. Admin user ---
  const adminEmail = "admin@example.com";
  const adminPassword = "Admin1234!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let admin;
  if (!existingAdmin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
        name: "Admin",
      },
    });
    console.log("Admin created:", adminEmail);
  } else {
    admin = existingAdmin;
    console.log("Admin already exists:", adminEmail);
  }

  // --- 2. Categories ---
  const catNames = ["Electronics", "Clothing", "Books"];
  const categories = [];
  for (const name of catNames) {
    let category = await prisma.category.findFirst({ where: { slug: slugify(name) } });
    if (!category) {
      category = await prisma.category.create({
        data: { name, slug: slugify(name) },
      });
    }
    categories.push(category);
  }
  console.log("Categories created:", categories.map(c => c.name));

  // --- 3. Products ---
  const products = [
    { name: "Wireless Headphones", description: "High-quality sound", price: 79.99, stock: 50, categoryName: "Electronics" },
    { name: "Smartphone Case", description: "Durable protection", price: 19.99, stock: 200, categoryName: "Electronics" },
    { name: "Basic T-Shirt", description: "Comfortable cotton", price: 12.5, stock: 150, categoryName: "Clothing" },
    { name: "Novel: The Journey", description: "Bestselling novel", price: 9.99, stock: 80, categoryName: "Books" }
  ];

  for (const p of products) {
    const category = categories.find(c => c.name === p.categoryName);
    if (!category) continue;

    const existingProduct = await prisma.product.findFirst({
      where: { name: p.name, categoryId: category.id },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          categoryId: category.id,
        },
      });
    }
  }
  console.log("Products seeded successfully.");
}

main()
  .catch(e => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
