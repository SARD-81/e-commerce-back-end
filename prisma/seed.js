import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/utils/slugify.js";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "Admin1234!";

  // upsert admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      name: "Admin"
    }
  });

  // categories
  const catNames = ["Electronics", "Clothing", "Books"];
  const cats = [];
  for (const name of catNames) {
    const cat = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) }
    });
    cats.push(cat);
  }

  // products
  const products = [
    { title: "Wireless Headphones", price: 79.99, stock: 50, categoryId: cats[0].id },
    { title: "Smartphone Case", price: 19.99, stock: 200, categoryId: cats[0].id },
    { title: "Basic T-Shirt", price: 12.50, stock: 150, categoryId: cats[1].id },
    { title: "Novel: The Journey", price: 9.99, stock: 80, categoryId: cats[2].id }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: slugify(p.title) },
      update: {},
      create: {
        title: p.title,
        slug: slugify(p.title),
        price: p.price,
        stock: p.stock,
        categoryId: p.categoryId
      }
    });
  }

  console.log("Seed complete. Admin:", adminEmail, adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });