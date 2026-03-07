"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbPath = process.env.DB_PATH ?? "./data/mealplanner.db";
const dir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dir))
    fs_1.default.mkdirSync(dir, { recursive: true });
exports.db = new better_sqlite3_1.default(dbPath);
// Enable WAL mode for better concurrent read performance
exports.db.pragma("journal_mode = WAL");
exports.db.pragma("foreign_keys = ON");
// ── Schema ────────────────────────────────────────────────────────────────────
exports.db.exec(`
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
const seedMeals = exports.db.prepare("SELECT COUNT(*) as count FROM meals").get();
if (seedMeals.count === 0) {
    const insert = exports.db.prepare("INSERT INTO meals (name, emoji, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)");
    const seedAll = exports.db.transaction(() => {
        const library = [
            ["Avocado Toast", "🥑", 320, 12, 38, 16],
            ["Greek Yogurt Bowl", "🥣", 280, 20, 32, 6],
            ["Grilled Chicken Salad", "🥗", 410, 42, 18, 18],
            ["Quinoa Buddha Bowl", "🥙", 490, 18, 72, 14],
            ["Salmon & Veggies", "🐟", 520, 46, 22, 24],
            ["Lentil Soup", "🍲", 340, 22, 54, 4],
            ["Overnight Oats", "🌾", 360, 14, 58, 8],
            ["Turkey Wrap", "🌯", 430, 34, 42, 12],
            ["Veggie Stir Fry", "🥦", 380, 16, 52, 10],
            ["Egg White Omelette", "🍳", 210, 28, 6, 8],
            ["Protein Smoothie", "🥤", 290, 30, 28, 6],
            ["Brown Rice Bowl", "🍱", 460, 20, 68, 10],
            ["Mixed Nuts", "🥜", 180, 6, 8, 16],
            ["Apple & PB", "🍎", 220, 6, 28, 10],
        ];
        for (const row of library)
            insert.run(...row);
    });
    seedAll();
    console.log("✅ Seeded meal library");
}
console.log(`✅ SQLite connected at ${dbPath}`);
//# sourceMappingURL=database.js.map