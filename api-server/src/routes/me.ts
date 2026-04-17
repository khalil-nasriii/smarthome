import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthUserId } from "../lib/authRequest";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "missing_auth" });
  }

  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json({ user });
});

export default router;

