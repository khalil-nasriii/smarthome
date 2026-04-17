import jwt from "jsonwebtoken";
import { env } from "./env";

export type AuthTokenPayload = {
  sub: string;
};

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const sub = (decoded as { sub?: unknown }).sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new Error("Invalid token subject");
  }

  return { sub };
}

