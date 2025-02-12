import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma || new PrismaClient({ omit: { user: { password: true } } }) as PrismaClient;
if (process.env.NODE_ENV !== "production") global.prisma = prisma