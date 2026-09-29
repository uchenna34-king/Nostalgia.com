import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Password hashing with Node's built-in scrypt — no native dependency, runs on
// Vercel's Node runtime as-is. The parameters are stored inside each hash
// ("scrypt$N$r$p$salt$hash"), so they can be raised later without breaking
// existing accounts.
const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 64;
// scrypt needs ~128*N*r bytes (32 MiB here); Node's default ceiling is 32 MiB,
// so give it headroom.
const MAX_MEM = 64 * 1024 * 1024;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, { N: n, r, p, maxmem: MAX_MEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Constant-time check. Returns false (never throws) for a malformed hash. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  if (expected.length === 0) return false;
  try {
    const actual = await derive(
      password,
      Buffer.from(saltB64, "base64"),
      Number(n),
      Number(r),
      Number(p),
      expected.length,
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns the same scrypt time as a real check. Sign-in calls it when no account
 * matches, so response timing doesn't reveal which emails are registered.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("nostalgia-timing-equaliser");
  await verifyPassword(password, await dummyHash);
}
