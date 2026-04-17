import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";

type AuthedRequest = Request & {
  user?: {
    id: number;
  };
};

function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = parseBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "missing_auth" });
    }

    const payload = verifyAccessToken(token);
    const id = Number(payload.sub);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(401).json({ error: "invalid_auth" });
    }

    (req as AuthedRequest).user = { id };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_auth" });
  }
}

