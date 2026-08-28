// Connection pooling for Vercel serverless is handled by the Neon endpoint
// named in DATABASE_URL (Neon's own pooler), not by this client. The
// globalThis singleton below exists only to survive Next.js dev-mode
// hot-reloads (avoiding a fresh PrismaClient — and a fresh connection pool —
// on every file save). No Prisma driver adapter is required or installed at
// the Prisma version this project is pinned to; do not add one to "fix"
// pooling here.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
