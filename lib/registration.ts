import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  EMAIL_TAKEN,
  normalizeEmail,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/registration-rules";

/**
 * Email + password sign-up, verified before the account exists.
 *
 * 1. startRegistration() validates the form, hashes the password and parks it
 *    in PendingRegistration with a single-use token (only its SHA-256 is
 *    stored). The caller emails the link.
 * 2. completeRegistration() runs when the link is clicked: it creates the User
 *    with emailVerified set, then deletes the pending row.
 *
 * No User row exists until step 2, so an address nobody has verified can
 * never be signed into. That matters beyond tidiness: /admin is granted by
 * email (lib/admin.ts), so an unverified password account on the owner's
 * address would be an admin account.
 */

export * from "@/lib/registration-rules";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function emailTaken(
  db: Prisma.TransactionClient | typeof prisma,
  email: string,
): Promise<boolean> {
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return user !== null;
}

export async function startRegistration(
  input: RegistrationInput,
): Promise<
  | { ok: true; email: string; token: string }
  | { ok: false; errors: RegistrationErrors }
> {
  const errors = validateRegistration(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const name = input.name.trim();
  const email = normalizeEmail(input.email);

  if (await emailTaken(prisma, email)) {
    return { ok: false, errors: { email: EMAIL_TAKEN } };
  }

  const passwordHash = await hashPassword(input.password);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  // Re-registering before verifying replaces the earlier attempt (and voids
  // its link) rather than erroring.
  await prisma.pendingRegistration.upsert({
    where: { email },
    create: { email, name, passwordHash, tokenHash, expires },
    update: { name, passwordHash, tokenHash, expires },
  });

  return { ok: true, email, token };
}

export type VerifyOutcome = "verified" | "invalid" | "expired" | "exists";

export async function completeRegistration(
  token: string | undefined,
): Promise<VerifyOutcome> {
  if (!token) return "invalid";

  const pending = await prisma.pendingRegistration.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!pending) return "invalid";

  if (pending.expires.getTime() < Date.now()) {
    await prisma.pendingRegistration
      .delete({ where: { id: pending.id } })
      .catch(() => undefined);
    return "expired";
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Deleting first makes the token single-use: a second click racing this
      // one fails the delete and lands in the catch below.
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      // Someone may have signed up with Google on this address meanwhile.
      if (await emailTaken(tx, pending.email)) return "exists" as const;
      await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          emailVerified: new Date(),
          passwordHash: pending.passwordHash,
        },
      });
      return "verified" as const;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return "invalid"; // already used
      if (err.code === "P2002") return "exists"; // unique email race
    }
    throw err;
  }
}
