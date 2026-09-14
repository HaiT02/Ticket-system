import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.join(__dirname, "../../database/tickets.db");

// Vitest uses an isolated database, so tests never delete saved tickets.
const isTest = process.env.VITEST === "true";
if (!isTest) mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(isTest ? ":memory:" : databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  )
`);

export default db;