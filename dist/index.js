"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = require("./routes");
// Initialize DB (runs schema + seed)
require("./config/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 8080;
// ── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", routes_1.authRouter);
app.use("/api/meals", routes_1.mealsRouter);
app.use("/api/plan", routes_1.planRouter);
// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));
// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Meal Planner API running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map