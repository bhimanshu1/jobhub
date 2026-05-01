"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSessionCookie,
  destroyCurrentSession,
  hashPassword,
  validateCredentials,
  verifyPassword,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth";

export type AuthFormState = { error: string } | null;

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = ((formData.get("username") as string | null) ?? "")
    .trim()
    .toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";

  const validationError = validateCredentials(username, password);
  if (validationError) return { error: validationError };

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "That username is already taken." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash },
  });

  await createSessionCookie(user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = ((formData.get("username") as string | null) ?? "")
    .trim()
    .toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  // Brute-force protection: refuse if currently locked.
  const limit = await checkLoginRateLimit(username);
  if (!limit.allowed) {
    return {
      error: `Too many failed attempts. Try again in ${limit.minutesLeft} minute${limit.minutesLeft === 1 ? "" : "s"}.`,
    };
  }

  // Always do the password compare even if user not found, to avoid
  // leaking which usernames exist via timing.
  const user = await prisma.user.findUnique({ where: { username } });
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2a$10$invalidinvalidinvalidinvaliduC9");

  if (!user || !ok) {
    if (user) await recordFailedLogin(username);
    return { error: "Wrong username or password." };
  }

  await recordSuccessfulLogin(user.id);
  await createSessionCookie(user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signoutAction(): Promise<void> {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  redirect("/");
}
