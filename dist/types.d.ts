export interface User {
    id: number;
    username: string;
    email: string;
    password: string;
    created_at: string;
}
export interface Meal {
    id: number;
    name: string;
    emoji: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}
export interface MealEntry {
    id: number;
    user_id: number;
    meal_id: number;
    day_of_week: string;
    meal_type: string;
    week_label: string;
}
export interface MealEntryWithMeal extends MealEntry {
    meal: Meal;
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                username: string;
            };
        }
    }
}
//# sourceMappingURL=types.d.ts.map