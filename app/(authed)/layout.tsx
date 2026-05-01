import { requireUser } from "@/lib/auth";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no valid session.
  await requireUser();
  return <>{children}</>;
}
