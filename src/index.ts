import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter, mealsRouter, planRouter } from "./routes";

// Initialize DB (runs schema + seed)
import "./config/database";

const app = express();
const PORT = process.env.PORT ?? 8080;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",  authRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/plan",  planRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Meal Planner API running on http://localhost:${PORT}`);
});
