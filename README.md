# 🥗 Meal Planner — Node.js + TypeScript

Full-stack meal planning app with AI-powered week generation.

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React + Vite + TypeScript               |
| Backend        | Node.js + Express + TypeScript          |
| Database       | SQLite (via better-sqlite3, relational) |
| Authentication | JWT (jsonwebtoken) + bcryptjs           |
| Validation     | Zod                                     |
| AI Generation  | Anthropic Claude API                    |

---

## Project Structure

```
meal-planner-node/
├── package.json
├── tsconfig.json
├── .env.example
│
├── src/                              # Express API
│   ├── index.ts                      # Entry point
│   ├── types.ts                      # Shared interfaces
│   ├── config/
│   │   └── database.ts               # SQLite init, schema, seeding
│   ├── middleware/
│   │   └── auth.ts                   # JWT generate + authenticate middleware
│   ├── controllers/
│   │   ├── authController.ts         # register, login, getMe
│   │   ├── mealsController.ts        # getAllMeals, getMealById
│   │   └── planController.ts         # getWeekPlan, setSlot, bulkSetWeek
│   └── routes/
│       └── index.ts                  # authRouter, mealsRouter, planRouter
│
└── frontend/src/                     # React + TypeScript
    ├── types.ts                      # Shared frontend types
    ├── services/
    │   └── api.ts                    # Typed fetch wrapper + all API calls
    └── context/
        └── AuthContext.tsx           # Auth state + login/register/logout
```

---

## Getting Started

### 1. Backend

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Run in development (hot reload)
npm run dev

# Or build and run in production
npm run build && npm start
```

API runs at `http://localhost:8080`

### 2. Frontend

```bash
cd frontend
npm install        # if using a separate frontend package.json
npm run dev
```

React app runs at `http://localhost:5173`

---

## Environment Variables

| Variable       | Default                          | Description              |
|----------------|----------------------------------|--------------------------|
| PORT           | 8080                             | Server port              |
| JWT_SECRET     | (required)                       | Secret for signing JWTs  |
| JWT_EXPIRES_IN | 24h                              | Token lifetime           |
| DB_PATH        | ./data/mealplanner.db            | SQLite file path         |
| CORS_ORIGIN    | http://localhost:5173            | Allowed frontend origin  |

---

## API Reference

### Auth
| Method | Path               | Body                          | Auth |
|--------|--------------------|-------------------------------|------|
| POST   | /api/auth/register | `{username, email, password}` | No   |
| POST   | /api/auth/login    | `{username, password}`        | No   |
| GET    | /api/auth/me       | —                             | Yes  |

Returns `{ token, username }` — send as `Authorization: Bearer <token>`

### Meals
| Method | Path           | Description       | Auth |
|--------|----------------|-------------------|------|
| GET    | /api/meals     | List all meals    | No   |
| GET    | /api/meals/:id | Get single meal   | No   |

### Meal Plan
| Method | Path           | Description                          | Auth |
|--------|----------------|--------------------------------------|------|
| GET    | /api/plan?week=| Get week plan (e.g. `?week=2026-W10`)| Yes  |
| PUT    | /api/plan      | Set or clear a single slot           | Yes  |
| PUT    | /api/plan/bulk | Set entire week (AI generation)      | Yes  |

#### PUT /api/plan body
```json
{ "dayOfWeek": "Mon", "mealType": "Breakfast", "mealId": 7, "weekLabel": "2026-W10" }
```
Set `mealId` to `null` to clear the slot.

#### PUT /api/plan/bulk body
```json
{
  "weekLabel": "2026-W10",
  "entries": [
    { "dayOfWeek": "Mon", "mealType": "Breakfast", "mealId": 7 },
    { "dayOfWeek": "Mon", "mealType": "Lunch",     "mealId": 3 }
  ]
}
```

---

## Database Schema (SQLite)

```sql
users        (id, username, email, password, created_at)
meals        (id, name, emoji, calories, protein, carbs, fat)
meal_entries (id, user_id, meal_id, day_of_week, meal_type, week_label)
             UNIQUE(user_id, day_of_week, meal_type, week_label)
```

SQLite file persists to `./data/mealplanner.db` across restarts.  
To use an in-memory DB (resets on restart), set `DB_PATH=:memory:` in `.env`.

---

## Connecting the Frontend

Replace `window.storage` in `meal-planner.jsx` with the typed API service:

```ts
import { planApi, mealsApi, getCurrentWeekLabel, entriesToWeekPlan } from "./services/api";

const week = getCurrentWeekLabel(); // "2026-W10"

// Load week on mount
const entries = await planApi.getWeek(week);
const weekPlan = entriesToWeekPlan(entries); // matches your existing WeekPlan shape

// Save a slot when user picks a meal
await planApi.setSlot("Mon", "Breakfast", meal.id, week);

// Clear a slot on remove
await planApi.clearSlot("Mon", "Breakfast", week);

// After AI generation — bulk save
await planApi.bulkSet(week, [
  { dayOfWeek: "Mon", mealType: "Breakfast", mealId: 7 },
  { dayOfWeek: "Mon", mealType: "Lunch",     mealId: 3 },
  // ...
]);
```

---

## Authentication Flow

1. User registers → password hashed with bcrypt (12 rounds)
2. JWT issued on register + login, stored in `localStorage`
3. Every request sends `Authorization: Bearer <token>`
4. `authenticate` middleware verifies token, attaches `req.user`
5. Token expires after 24h (configurable via `JWT_EXPIRES_IN`)
