"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRouter = exports.mealsRouter = exports.authRouter = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const mealsController_1 = require("../controllers/mealsController");
const planController_1 = require("../controllers/planController");
const auth_1 = require("../middleware/auth");
// ── Auth ──────────────────────────────────────────────────────────────────────
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", authController_1.register);
exports.authRouter.post("/login", authController_1.login);
exports.authRouter.get("/me", auth_1.authenticate, authController_1.getMe);
// ── Meals ─────────────────────────────────────────────────────────────────────
exports.mealsRouter = (0, express_1.Router)();
exports.mealsRouter.get("/", mealsController_1.getAllMeals);
exports.mealsRouter.get("/:id", mealsController_1.getMealById);
// ── Plan ──────────────────────────────────────────────────────────────────────
exports.planRouter = (0, express_1.Router)();
exports.planRouter.use(auth_1.authenticate); // all plan routes require auth
exports.planRouter.get("/", planController_1.getWeekPlan);
exports.planRouter.put("/", planController_1.setSlot);
exports.planRouter.put("/bulk", planController_1.bulkSetWeek);
//# sourceMappingURL=index.js.map