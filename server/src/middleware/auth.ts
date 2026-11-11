import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthedRequest extends Request {
  studentId?: string;
}

export function signToken(studentId: string): string {
  return jwt.sign({ studentId }, JWT_SECRET, { expiresIn: "90d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { studentId: string };
    req.studentId = payload.studentId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
