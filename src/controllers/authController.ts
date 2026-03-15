import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../config/database";
import { generateToken } from "../middleware/auth";
import { User } from "../types";
import { logger } from "../config/logger";

const RegisterSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { username, email, password } = parsed.data;

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email) as User | undefined;

  if (existing) {
    logger.warn("Registration failed: username or email already taken", { username, email });
    res.status(409).json({ error: "Username or email already taken" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const result = db
    .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
    .run(username, email, hashed);

  logger.info("User registered", { userId: result.lastInsertRowid, username });
  const token = generateToken({ id: result.lastInsertRowid as number, username });
  res.status(201).json({ token, username });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { username, password } = parsed.data;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as User | undefined;

  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.warn("Login failed: invalid credentials", { username });
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  logger.info("User logged in", { userId: user.id, username: user.username });
  const token = generateToken({ id: user.id, username: user.username });
  res.json({ token, username: user.username });
}

export function getMe(req: Request, res: Response): void {
  res.json({ id: req.user!.id, username: req.user!.username });
}
