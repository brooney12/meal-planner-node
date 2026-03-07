"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMeals = getAllMeals;
exports.getMealById = getMealById;
const database_1 = require("../config/database");
function getAllMeals(_req, res) {
    const meals = database_1.db.prepare("SELECT * FROM meals ORDER BY id").all();
    res.json(meals);
}
function getMealById(req, res) {
    const meal = database_1.db
        .prepare("SELECT * FROM meals WHERE id = ?")
        .get(Number(req.params.id));
    if (!meal) {
        res.status(404).json({ error: "Meal not found" });
        return;
    }
    res.json(meal);
}
//# sourceMappingURL=mealsController.js.map