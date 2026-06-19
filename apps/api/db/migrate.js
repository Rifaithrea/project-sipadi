import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://sipadi:sipadi123@localhost:5432/sipadi"
});

async function main() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await pool.end();
  console.log("Schema database SIPADI berhasil diterapkan.");
}

main().catch(async (error) => {
  await pool.end();
  console.error(error);
  process.exit(1);
});
