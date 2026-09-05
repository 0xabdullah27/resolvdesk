import { auth } from "../lib/auth";
import { getMigrations } from "better-auth/db/migration";

async function run() {
  console.log("Fetching Better Auth migrations...");
  const { toBeCreated, toBeAdded, toBeAddedIndexes, runMigrations, compileMigrations } =
    await getMigrations(auth.options);

  console.log("Tables to create:", toBeCreated.map((t) => t.table));
  console.log("Columns to add:", toBeAdded.map((t) => t.table));
  console.log("Indexes to add:", toBeAddedIndexes.map((i) => i.name));

  const sqlCode = await compileMigrations();
  console.log("Compiled SQL:\n", sqlCode);

  await runMigrations();
  console.log("Migration executed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
