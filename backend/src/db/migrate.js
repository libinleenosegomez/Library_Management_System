/* Runs every .sql file in ./migrations in order against DATABASE_URL. */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function migrate() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  console.log(`Found ${files.length} migration file(s).`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Applying ${file} ...`);
    await pool.query(sql);
    console.log(`✓ ${file} applied`);
  }
  console.log("All migrations applied successfully.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
