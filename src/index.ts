import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { authRouter, mealsRouter, planRouter } from "./routes";
import { logger } from "./config/logger";

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

// HTTP request logging — pipe morgan output through winston
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    stream: { write: (msg) => logger.http(msg.trimEnd()) },
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",  authRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/plan",  planRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn("Route not found", { method: req.method, url: req.url });
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Meal Planner API running on http://localhost:${PORT}`);
});
