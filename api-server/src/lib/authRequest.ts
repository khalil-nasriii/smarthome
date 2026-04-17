import type { Request } from "express";

type AuthedRequest = Request & {
  user?: {
    id: number;
  };
};

export function getAuthUserId(req: Request): number | null {
  const id = (req as AuthedRequest).user?.id;
  return typeof id === "number" && id > 0 ? id : null;
}

