import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_ACTIONS, XP_REASONS } from "../lib/xp";
import { markRecommendationCompleted } from "../lib/recommend";

export const focusSessionsRouter = wrapAsync(Router());
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
  const resolvedAssignmentId: string | null = assignmentId || null;

  const [mostRecent, priorSessionsForAssignment] = await Promise.all([
    prisma.focusSession.findFirst({ where: { studentId: req.studentId }, orderBy: { startedAt: "desc" } }),
    resolvedAssignmentId
      ? prisma.focusSession.count({ where: { studentId: req.studentId, assignmentId: resolvedAssignmentId } })
      : Promise.resolve(0),
  ]);

  const session = await prisma.focusSession.create({
    data: {
      studentId: req.studentId!,
      assignmentId: resolvedAssignmentId,
      durationMinutes: Number(durationMinutes) || 10,
    },
  });

  const xpEvents = [];

  // Simple spam guard: starting another session within 60s of the last one
  // doesn't earn a second "started" reward.
  const recentlyStarted = mostRecent && Date.now() - new Date(mostRecent.startedAt).getTime() < 60_000;
  if (!recentlyStarted) {
    const xp = await awardXp(req.studentId!, XP_REASONS.START_FOCUS_SESSION);
    if (xp) xpEvents.push(xp);
  }

  if (resolvedAssignmentId && priorSessionsForAssignment > 0) {
    const resumeXp = await awardXp(req.studentId!, XP_REASONS.RESUME_TASK, {
      actionType: XP_ACTIONS.RESUME_TASK,
      relatedEntityType: "assignment",
      relatedEntityId: resolvedAssignmentId,
      oncePerEntity: true,
    });
    if (resumeXp) xpEvents.push(resumeXp);
  }

  res.status(201).json({ session, xpEvents });
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
    xp = await awardXp(req.studentId!, XP_REASONS.FOCUS_SESSION, {
      actionType: XP_ACTIONS.FOCUS_SESSION,
      relatedEntityType: "focus_session",
      relatedEntityId: session.id,
      oncePerEntity: true,
    });
    if (session.assignmentId) {
      await markRecommendationCompleted(req.studentId!, "assignment", session.assignmentId);
    }
  }
  res.json({ session, xp });
});
