import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

import { Role } from "../src/common/constants/roles";

const seedSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("change-this-admin-password"),
  SEED_ADMIN_NAME: z.string().min(1).default("Devc Admin"),
});

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const env = seedSchema.parse(process.env);
  const passwordHash = await hash(env.SEED_ADMIN_PASSWORD, 12);
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();

  await prisma.user.upsert({
    where: { email },
    update: {
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email,
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
