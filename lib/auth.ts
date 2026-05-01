import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "./db";

const COOKIE_NAME = "jh_session";
const SESSION_DAYS = 30;
const REFRESH_THRESHOLD_DAYS = 15;
const BCRYPT_ROUNDS = 10;

export type SessionUser = {
  id: string;
  username: string;
  displayName: string | null;
};

// ---------- Password ----------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------- Session tokens ----------
//
// We store only the SHA-256 of the token in the DB. The cookie holds the
// plaintext token. This way, if the DB is ever leaked, sessions can't be
// resumed without the original cookie values.

function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiryFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ---------- Sign in / sign out ----------

export async function createSessionCookie(userId: string): Promise<void> {
  const token = newRawToken();
  const expiresAt = expiryFromNow(SESSION_DAYS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      await prisma.session.deleteMany({
        where: { tokenHash: hashToken(token) },
      });
    } catch {
      // Ignore — we still clear the cookie below.
    }
  }
  jar.delete(COOKIE_NAME);
}

// ---------- Reading the current session ----------

/** Returns the current authed user or null. Side effect: refreshes session
 *  expiry when nearing the threshold. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // Best-effort cleanup; don't await failures.
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    jar.delete(COOKIE_NAME);
    return null;
  }

  // Sliding refresh: extend the session if we're past the refresh threshold.
  const remainingMs = session.expiresAt.getTime() - Date.now();
  if (remainingMs < REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
    const newExpiry = expiryFromNow(SESSION_DAYS);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    });
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: newExpiry,
    });
  }

  return session.user;
}

/** Throws-via-redirect if not authenticated. Use in protected pages/actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// ---------- Login rate limiting ----------

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/** Returns whether login is allowed for this username right now. */
export async function checkLoginRateLimit(
  username: string,
): Promise<{ allowed: true } | { allowed: false; minutesLeft: number }> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { lockedUntil: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const ms = user.lockedUntil.getTime() - Date.now();
    return { allowed: false, minutesLeft: Math.max(1, Math.ceil(ms / 60_000)) };
  }
  return { allowed: true };
}

/** Increment failed-login counter; lock the account once threshold reached. */
export async function recordFailedLogin(username: string): Promise<void> {
  // Use updateMany so we silently no-op for unknown usernames
  // (prevents enumeration via DB errors).
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, failedLoginAttempts: true },
  });
  if (!user) return;

  const next = user.failedLoginAttempts + 1;
  const shouldLock = next >= MAX_FAILED_ATTEMPTS;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: next,
      lockedUntil: shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : undefined,
    },
  });
}

/** Reset the counters on successful login. */
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

// ---------- Validation ----------

export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export function validateCredentials(
  username: string,
  password: string,
): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–32 chars, letters/numbers/underscore/dash only.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 128) {
    return "Password is too long (max 128).";
  }
  return null;
}
