import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const fns = {
    userFindFirst: vi.fn(),
    userCreate: vi.fn(),
    pendingFindUnique: vi.fn(),
    pendingUpsert: vi.fn(),
    pendingDelete: vi.fn(),
  };
  const client = {
    user: {
      findFirst: (...a: unknown[]) => fns.userFindFirst(...a),
      create: (...a: unknown[]) => fns.userCreate(...a),
    },
    pendingRegistration: {
      findUnique: (...a: unknown[]) => fns.pendingFindUnique(...a),
      upsert: (...a: unknown[]) => fns.pendingUpsert(...a),
      delete: (...a: unknown[]) => fns.pendingDelete(...a),
    },
    $transaction: (fn: (tx: unknown) => unknown) => fn(client),
  };
  return { fns, client };
});

vi.mock("@/lib/db", () => ({ prisma: db.client }));

import { hashPassword, verifyPassword } from "@/lib/password";
import {
  EMAIL_TAKEN,
  EMAIL_USES_GOOGLE,
  completeRegistration,
  hashToken,
  safeCallbackUrl,
  startRegistration,
  validateRegistration,
} from "@/lib/registration";

const valid = {
  name: "Ada Lovelace",
  email: "  Ada@Example.com ",
  password: "correct horse",
  confirm: "correct horse",
};

beforeEach(() => {
  for (const fn of Object.values(db.fns)) fn.mockReset();
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2$3$$")).toBe(false);
  });
});

describe("validateRegistration", () => {
  it("accepts a complete form", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("flags each bad field", () => {
    const errors = validateRegistration({
      name: " A ",
      email: "not-an-email",
      password: "short",
      confirm: "short",
    });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "password"]);
  });

  it("flags a mismatched confirmation", () => {
    expect(
      validateRegistration({ ...valid, confirm: "different horse" }).confirm,
    ).toBeDefined();
  });

  it("caps password length", () => {
    const long = "x".repeat(129);
    expect(
      validateRegistration({ ...valid, password: long, confirm: long })
        .password,
    ).toBeDefined();
  });
});

describe("safeCallbackUrl", () => {
  it("keeps same-site paths and drops everything else", () => {
    expect(safeCallbackUrl("/checkout")).toBe("/checkout");
    expect(safeCallbackUrl("https://evil.example")).toBe("/");
    expect(safeCallbackUrl("//evil.example")).toBe("/");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
  });
});

describe("startRegistration", () => {
  it("parks a pending sign-up with a hashed token, not an account", async () => {
    db.fns.userFindFirst.mockResolvedValue(null);
    const result = await startRegistration(valid);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.email).toBe("ada@example.com");
    expect(db.fns.userCreate).not.toHaveBeenCalled();

    const { create } = db.fns.pendingUpsert.mock.calls[0][0];
    expect(create.email).toBe("ada@example.com");
    expect(create.name).toBe("Ada Lovelace");
    expect(create.tokenHash).toBe(hashToken(result.token));
    expect(create.tokenHash).not.toBe(result.token);
    expect(await verifyPassword("correct horse", create.passwordHash)).toBe(
      true,
    );
  });

  it("refuses an email that already has a password account", async () => {
    db.fns.userFindFirst.mockResolvedValue({
      passwordHash: "scrypt$hash",
      accounts: [],
    });
    const result = await startRegistration(valid);
    expect(result).toEqual({ ok: false, errors: { email: EMAIL_TAKEN } });
    expect(db.fns.pendingUpsert).not.toHaveBeenCalled();
  });

  it("points a Google-only account at Continue with Google", async () => {
    db.fns.userFindFirst.mockResolvedValue({
      passwordHash: null,
      accounts: [{ provider: "google" }],
    });
    const result = await startRegistration(valid);
    expect(result).toEqual({
      ok: false,
      errors: { email: EMAIL_USES_GOOGLE },
    });
    expect(db.fns.pendingUpsert).not.toHaveBeenCalled();
  });

  it("says EMAIL_TAKEN when an account has both a password and Google", async () => {
    db.fns.userFindFirst.mockResolvedValue({
      passwordHash: "scrypt$hash",
      accounts: [{ provider: "google" }],
    });
    const result = await startRegistration(valid);
    expect(result).toEqual({ ok: false, errors: { email: EMAIL_TAKEN } });
  });

  it("looks the email up case-insensitively, with the fields it needs", async () => {
    db.fns.userFindFirst.mockResolvedValue(null);
    await startRegistration(valid);
    expect(db.fns.userFindFirst.mock.calls[0][0]).toEqual({
      where: { email: { equals: "ada@example.com", mode: "insensitive" } },
      select: { passwordHash: true, accounts: { select: { provider: true } } },
    });
  });

  it("returns validation errors without touching the database", async () => {
    const result = await startRegistration({ ...valid, email: "nope" });
    expect(result.ok).toBe(false);
    expect(db.fns.userFindFirst).not.toHaveBeenCalled();
  });
});

describe("completeRegistration", () => {
  const pending = {
    id: "p1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    passwordHash: "scrypt$hash",
    tokenHash: hashToken("tok"),
    expires: new Date(Date.now() + 60_000),
  };

  it("creates a verified user and consumes the token", async () => {
    db.fns.pendingFindUnique.mockResolvedValue(pending);
    db.fns.userFindFirst.mockResolvedValue(null);

    expect(await completeRegistration("tok")).toBe("verified");
    expect(db.fns.pendingFindUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("tok") },
    });
    expect(db.fns.pendingDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
    const { data } = db.fns.userCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      passwordHash: "scrypt$hash",
    });
    expect(data.emailVerified).toBeInstanceOf(Date);
  });

  it("rejects a missing or unknown token", async () => {
    expect(await completeRegistration(undefined)).toBe("invalid");
    db.fns.pendingFindUnique.mockResolvedValue(null);
    expect(await completeRegistration("nope")).toBe("invalid");
    expect(db.fns.userCreate).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    db.fns.pendingFindUnique.mockResolvedValue({
      ...pending,
      expires: new Date(Date.now() - 1),
    });
    db.fns.pendingDelete.mockResolvedValue(undefined);
    expect(await completeRegistration("tok")).toBe("expired");
    expect(db.fns.userCreate).not.toHaveBeenCalled();
  });

  it("does not create a second account if the email got registered meanwhile", async () => {
    db.fns.pendingFindUnique.mockResolvedValue(pending);
    db.fns.userFindFirst.mockResolvedValue({ id: "google-user" });
    expect(await completeRegistration("tok")).toBe("exists");
    expect(db.fns.userCreate).not.toHaveBeenCalled();
  });
});
