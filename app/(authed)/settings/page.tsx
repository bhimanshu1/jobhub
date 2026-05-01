import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DisplayNameForm } from "./display-name-form";

export const metadata = { title: "Settings · JobHub" };

export default async function SettingsPage() {
  const user = await requireUser();
  const fullUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { username: true, displayName: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="text-sm opacity-60 mt-1">
        Personalize how JobHub greets you.
      </p>

      <section className="mt-6 p-4 rounded border border-black/10 dark:border-white/10">
        <h2 className="font-medium mb-1">Display name</h2>
        <p className="text-sm opacity-60 mb-3">
          Shown in the greeting and header. Leave blank to use{" "}
          <code>@{fullUser.username}</code>.
        </p>
        <DisplayNameForm initial={fullUser.displayName ?? ""} />
      </section>

      <section className="mt-6 p-4 rounded border border-black/10 dark:border-white/10 text-sm opacity-70">
        <div>
          <span className="opacity-60">Username:</span>{" "}
          <code>@{fullUser.username}</code>
        </div>
        <div className="mt-1">
          <span className="opacity-60">Member since:</span>{" "}
          {fullUser.createdAt.toLocaleDateString()}
        </div>
      </section>
    </div>
  );
}
