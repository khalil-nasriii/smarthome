import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../lib/jwt";

const router: IRouter = Router();

const registerBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((s: string) => s.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((s: string) => s.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post("/auth/register", async (req, res) => {
  const body = registerBodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, body.data.email))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "email_in_use" });
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const inserted = await db
    .insert(usersTable)
    .values({ email: body.data.email, passwordHash })
    .returning({ id: usersTable.id, email: usersTable.email });

  const user = inserted[0];
  if (!user) {
    return res.status(500).json({ error: "create_failed" });
  }

  const token = signAccessToken({ sub: String(user.id) });
  return res.json({ token, user });
});

router.post("/auth/login", async (req, res) => {
  const body = loginBodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const found = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      passwordHash: usersTable.passwordHash,
    })
    .from(usersTable)
    .where(eq(usersTable.email, body.data.email))
    .limit(1);

  const user = found[0];
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const ok = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signAccessToken({ sub: String(user.id) });
  return res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;

