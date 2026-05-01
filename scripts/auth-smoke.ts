// Verifies the password+session primitives without going through HTTP.
// Run: npx tsx scripts/auth-smoke.ts

import "dotenv/config";
import { prisma } from "../lib/db";
import { hashPassword, verifyPassword, validateCredentials } from "../lib/auth";
import { randomBytes, createHash } from "node:crypto";

async function main() {
  // 0. Sanity: validation rules.
  console.assert(
    validateCredentials("ab", "pw") !== null,
    "short username should fail",
  );
  console.assert(
    validateCredentials("alice", "short") !== null,
    "short password should fail",
  );
  console.assert(
    validateCredentials("alice", "longenough123") === null,
    "valid creds should pass",
  );
  console.log("[ok] validateCredentials");

  // 1. Hash + verify roundtrip.
  const hash = await hashPassword("hunter2!secret");
  console.assert(
    await verifyPassword("hunter2!secret", hash),
    "password verify should succeed",
  );
  console.assert(
    !(await verifyPassword("wrong", hash)),
    "wrong password should fail",
  );
  console.log("[ok] hashPassword + verifyPassword");

  // 2. Create two users, simulate sessions, verify per-user scoping in DB.
  const u1 = await prisma.user.upsert({
    where: { username: "smoke_user1" },
    create: { username: "smoke_user1", passwordHash: hash },
    update: {},
  });
  const u2 = await prisma.user.upsert({
    where: { username: "smoke_user2" },
    create: { username: "smoke_user2", passwordHash: hash },
    update: {},
  });
  console.log("[ok] users created:", u1.username, u2.username);

  // 3. Create a session row for u1, look it up by hashed token.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.session.create({
    data: {
      tokenHash,
      userId: u1.id,
      expiresAt: new Date(Date.now() + 86400_000),
    },
  });
  const found = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  console.assert(found?.user.id === u1.id, "session lookup should resolve user");
  console.log("[ok] session lookup matches");

  // 4. Per-user company scoping: create a company for each user with the
  //    same atsType+slug — should not collide because the unique key now
  //    includes userId.
  await prisma.company.upsert({
    where: {
      userId_atsType_atsSlug: {
        userId: u1.id,
        atsType: "greenhouse",
        atsSlug: "smoketest",
      },
    },
    create: {
      userId: u1.id,
      name: "User 1 Test Co",
      atsType: "greenhouse",
      atsSlug: "smoketest",
      sourceUrl: "https://example.com",
    },
    update: {},
  });
  await prisma.company.upsert({
    where: {
      userId_atsType_atsSlug: {
        userId: u2.id,
        atsType: "greenhouse",
        atsSlug: "smoketest",
      },
    },
    create: {
      userId: u2.id,
      name: "User 2 Test Co",
      atsType: "greenhouse",
      atsSlug: "smoketest",
      sourceUrl: "https://example.com",
    },
    update: {},
  });
  const u1Companies = await prisma.company.findMany({
    where: { userId: u1.id },
    select: { name: true },
  });
  const u2Companies = await prisma.company.findMany({
    where: { userId: u2.id },
    select: { name: true },
  });
  console.assert(
    u1Companies.length === 1 && u1Companies[0].name === "User 1 Test Co",
    "u1 sees only their company",
  );
  console.assert(
    u2Companies.length === 1 && u2Companies[0].name === "User 2 Test Co",
    "u2 sees only their company",
  );
  console.log("[ok] per-user company scoping enforced");

  // 5. Cleanup the test rows.
  await prisma.user.deleteMany({
    where: { username: { in: ["smoke_user1", "smoke_user2"] } },
  });
  console.log("[ok] cleaned up");

  console.log("\nALL AUTH PRIMITIVES OK");
}

main()
  .catch((e) => {
    console.error("auth-smoke FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
