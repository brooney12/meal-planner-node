import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const dbPath = process.env.DB_PATH ?? "./data/mealplanner.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL UNIQUE,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meals (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    emoji     TEXT    NOT NULL,
    calories  INTEGER NOT NULL,
    protein   INTEGER NOT NULL,
    carbs     INTEGER NOT NULL,
    fat       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meal_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_id     INTEGER NOT NULL REFERENCES meals(id),
    day_of_week TEXT    NOT NULL,
    meal_type   TEXT    NOT NULL,
    week_label  TEXT    NOT NULL,
    UNIQUE(user_id, day_of_week, meal_type, week_label)
  );
`);

// ── Seed meal library ─────────────────────────────────────────────────────────
const seedMeals = db.prepare("SELECT COUNT(*) as count FROM meals").get() as { count: number };

if (seedMeals.count === 0) {
  const insert = db.prepare(
    "INSERT INTO meals (name, emoji, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    const library = [
      ["Avocado Toast",         "🥑", 320, 12, 38, 16],
      ["Greek Yogurt Bowl",     "🥣", 280, 20, 32,  6],
      ["Grilled Chicken Salad", "🥗", 410, 42, 18, 18],
      ["Quinoa Buddha Bowl",    "🥙", 490, 18, 72, 14],
      ["Salmon & Veggies",      "🐟", 520, 46, 22, 24],
      ["Lentil Soup",           "🍲", 340, 22, 54,  4],
      ["Overnight Oats",        "🌾", 360, 14, 58,  8],
      ["Turkey Wrap",           "🌯", 430, 34, 42, 12],
      ["Veggie Stir Fry",       "🥦", 380, 16, 52, 10],
      ["Egg White Omelette",    "🍳", 210, 28,  6,  8],
      ["Protein Smoothie",      "🥤", 290, 30, 28,  6],
      ["Brown Rice Bowl",       "🍱", 460, 20, 68, 10],
      ["Mixed Nuts",            "🥜", 180,  6,  8, 16],
      ["Apple & PB",            "🍎", 220,  6, 28, 10],
    ];
    for (const row of library) insert.run(...row);
  });
  seedAll();
  console.log("✅ Seeded meal library");
}

console.log(`✅ SQLite connected at ${dbPath}`);
