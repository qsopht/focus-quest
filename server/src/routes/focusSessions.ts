import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_REASONS } from "../lib/xp";

export const focusSessionsRouter = Router();
focusSessionsRouter.use(requireAuth);

focusSessionsRouter.get("/", async (req: AuthedRequest, res) => {
  const sessions = await prisma.focusSession.findMany({
    where: { studentId: req.studentId },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  res.json(sessions);
});

focusSessionsRouter.post("/", async (req: AuthedRequest, res) => {
  const { assignmentId, durationMinutes } = req.body ?? {};
  const session = await prisma.focusSession.create({
    data: {
      studentId: req.studentId!,
      assignmentId: assignmentId || null,
      durationMinutes: Number(durationMinutes) || 10,
    },
  });
  res.status(201).json(session);
});

focusSessionsRouter.post("/:id/finish", async (req: AuthedRequest, res) => {
  const existing = await prisma.focusSession.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { elapsedSeconds, completed } = req.body ?? {};
  const session = await prisma.focusSession.update({
    where: { id: existing.id },
    data: {
      elapsedSeconds: Number(elapsedSeconds) || 0,
      completed: Boolean(completed),
      endedAt: new Date(),
    },
  });

  let xp = null;
  // Award XP for any meaningful effort (at least ~2 minutes), not just a perfect finish,
  // per the spec's "reward effort and progress, not just perfect completion."
  if (session.elapsedSeconds >= 120) {
    xp = await awardXp(req.studentId!, XP_REASONS.FOCUS_SESSION);
  }
  res.json({ session, xp });
});
