"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const RegisterSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const LoginSchema = zod_1.z.object({
    username: zod_1.z.string(),
    password: zod_1.z.string(),
});
async function register(req, res) {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { username, email, password } = parsed.data;
    const existing = database_1.db
        .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
        .get(username, email);
    if (existing) {
        res.status(409).json({ error: "Username or email already taken" });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const result = database_1.db
        .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
        .run(username, email, hashed);
    const token = (0, auth_1.generateToken)({ id: result.lastInsertRowid, username });
    res.status(201).json({ token, username });
}
async function login(req, res) {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid request" });
        return;
    }
    const { username, password } = parsed.data;
    const user = database_1.db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username);
    if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
    }
    const token = (0, auth_1.generateToken)({ id: user.id, username: user.username });
    res.json({ token, username: user.username });
}
function getMe(req, res) {
    res.json({ id: req.user.id, username: req.user.username });
}
//# sourceMappingURL=authController.js.map