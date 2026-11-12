import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_ACTIONS, XP_REASONS } from "../lib/xp";
import { friendlyDue, endOfDay, endOfThisWeek, startOfDay, parseDateInput } from "../lib/dates";
import { suggestSteps } from "../lib/stepSuggestions";
import { markRecommendationCompleted } from "../lib/recommend";

export const assignmentsRouter = wrapAsync(Router());
assignmentsRouter.use(requireAuth);

function serialize(a: any) {
  return {
    ...a,
    friendlyDue: friendlyDue(a.dueDate ? new Date(a.dueDate) : null),
  };
}

assignmentsRouter.get("/", async (req: AuthedRequest, res) => {
  const bucket = String(req.query.bucket || "all");
  const studentId = req.studentId!;
  const now = new Date();

  const where: any = { studentId };

  if (bucket === "today") {
    where.status = "active";
    where.dueDate = { gte: startOfDay(now), lte: endOfDay(now) };
  } else if (bucket === "week") {
    where.status = "active";
    where.dueDate = { gt: endOfDay(now), lte: endOfThisWeek(now) };
  } else if (bucket === "upcoming") {
    where.status = "active";
    where.dueDate = { gt: endOfThisWeek(now) };
  } else if (bucket === "overdue") {
    where.status = "active";
    where.dueDate = { lt: startOfDay(now) };
  } else if (bucket === "active") {
    where.status = "active";
  } else if (bucket === "completed") {
    where.status = "completed";
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: { subject: true, steps: { orderBy: { order: "asc" } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  res.json(assignments.map(serialize));
});

assignmentsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({
    where: { id: req.params.id, studentId: req.studentId },
    include: { subject: true, steps: { orderBy: { order: "asc" } } },
  });
  if (!assignment) return res.status(404).json({ error: "Not found" });
  res.json(serialize(assignment));
});

assignmentsRouter.post("/", async (req: AuthedRequest, res) => {
  const { title, subjectId, dueDate, estimatedMinutes, notes, priority } = req.body ?? {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });

  const assignment = await prisma.assignment.create({
    data: {
      studentId: req.studentId!,
      title: String(title).trim(),
      subjectId: subjectId || null,
      dueDate: dueDate ? parseDateInput(dueDate) : null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      notes: notes || null,
      priority: priority || "medium",
    },
    include: { subject: true, steps: true },
  });

  const xp = await awardXp(req.studentId!, XP_REASONS.ADD_ASSIGNMENT, {
    actionType: XP_ACTIONS.ADD_ASSIGNMENT,
    relatedEntityType: "assignment",
    relatedEntityId: assignment.id,
    oncePerEntity: true,
  });
  res.status(201).json({ assignment: serialize(assignment), xp });
});

assignmentsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { title, subjectId, dueDate, estimatedMinutes, notes, priority } = req.body ?? {};
  const assignment = await prisma.assignment.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(subjectId !== undefined ? { subjectId: subjectId || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? parseDateInput(dueDate) : null } : {}),
      ...(estimatedMinutes !== undefined ? { estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(priority !== undefined ? { priority } : {}),
    },
    include: { subject: true, steps: { orderBy: { order: "asc" } } },
  });

  // Reward organizing behaviors (setting these for the first time), not every edit.
  let xp = null;
  if (dueDate !== undefined && !existing.dueDate && assignment.dueDate) {
    xp =
      (await awardXp(req.studentId!, XP_REASONS.ADD_DUE_DATE, {
        actionType: XP_ACTIONS.ADD_DUE_DATE,
        relatedEntityType: "assignment",
        relatedEntityId: assignment.id,
        oncePerEntity: true,
      })) ?? xp;
  }
  if (subjectId !== undefined && !existing.subjectId && assignment.subjectId) {
    xp =
      (await awardXp(req.studentId!, XP_REASONS.SET_SUBJECT, {
        actionType: XP_ACTIONS.SET_SUBJECT,
        relatedEntityType: "assignment",
        relatedEntityId: assignment.id,
        oncePerEntity: true,
      })) ?? xp;
  }

  res.json({ assignment: serialize(assignment), xp });
});

assignmentsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.assignment.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});

assignmentsRouter.post("/:id/complete", async (req: AuthedRequest, res) => {
  const existing = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.status === "completed") return res.json({ assignment: serialize(existing), xp: null });

  const assignment = await prisma.assignment.update({
    where: { id: existing.id },
    data: { status: "completed", completedAt: new Date() },
    include: { subject: true, steps: { orderBy: { order: "asc" } } },
  });

  const xp = await awardXp(req.studentId!, XP_REASONS.COMPLETE_ASSIGNMENT, {
    actionType: XP_ACTIONS.COMPLETE_ASSIGNMENT,
    relatedEntityType: "assignment",
    relatedEntityId: assignment.id,
    oncePerEntity: true,
  });
  await markRecommendationCompleted(req.studentId!, "assignment", assignment.id);
  res.json({ assignment: serialize(assignment), xp });
});

assignmentsRouter.post("/:id/reopen", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.updateMany({
    where: { id: req.params.id, studentId: req.studentId },
    data: { status: "active", completedAt: null },
  });
  res.json({ updated: assignment.count });
});

assignmentsRouter.get("/:id/suggest-steps", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({
    where: { id: req.params.id, studentId: req.studentId },
    include: { subject: true },
  });
  if (!assignment) return res.status(404).json({ error: "Not found" });
  const steps = suggestSteps(assignment.title, assignment.subject?.name);
  res.json({ steps });
});

// --- Steps ---

assignmentsRouter.post("/:id/steps", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!assignment) return res.status(404).json({ error: "Not found" });

  const titles: string[] = Array.isArray(req.body?.titles)
    ? req.body.titles
    : req.body?.title
    ? [req.body.title]
    : [];
  if (titles.length === 0) return res.status(400).json({ error: "At least one step title is required" });

  const existingCount = await prisma.assignmentStep.count({ where: { assignmentId: assignment.id } });
  await prisma.assignmentStep.createMany({
    data: titles.map((title, i) => ({
      assignmentId: assignment.id,
      title: String(title).trim(),
      order: existingCount + i,
    })),
  });

  let xp = null;
  if (existingCount === 0) {
    xp = await awardXp(req.studentId!, XP_REASONS.BREAK_INTO_STEPS, {
      actionType: XP_ACTIONS.BREAK_INTO_STEPS,
      relatedEntityType: "assignment",
      relatedEntityId: assignment.id,
      oncePerEntity: true,
    });
  }

  const steps = await prisma.assignmentStep.findMany({ where: { assignmentId: assignment.id }, orderBy: { order: "asc" } });
  res.status(201).json({ steps, xp });
});

assignmentsRouter.patch("/:id/steps/:stepId", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!assignment) return res.status(404).json({ error: "Not found" });

  const { title, order } = req.body ?? {};
  const step = await prisma.assignmentStep.update({
    where: { id: req.params.stepId },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(order !== undefined ? { order: Number(order) } : {}),
    },
  });
  res.json(step);
});

assignmentsRouter.delete("/:id/steps/:stepId", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!assignment) return res.status(404).json({ error: "Not found" });
  await prisma.assignmentStep.delete({ where: { id: req.params.stepId } });
  res.status(204).end();
});

assignmentsRouter.post("/:id/steps/:stepId/complete", async (req: AuthedRequest, res) => {
  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!assignment) return res.status(404).json({ error: "Not found" });

  const step = await prisma.assignmentStep.findUnique({ where: { id: req.params.stepId } });
  if (!step || step.assignmentId !== assignment.id) return res.status(404).json({ error: "Step not found" });

  const makeComplete = !step.completed;
  const updated = await prisma.assignmentStep.update({
    where: { id: step.id },
    data: { completed: makeComplete, completedAt: makeComplete ? new Date() : null },
  });

  let xp = null;
  if (makeComplete) {
    xp = await awardXp(req.studentId!, XP_REASONS.COMPLETE_STEP, {
      actionType: XP_ACTIONS.COMPLETE_STEP,
      relatedEntityType: "assignment_step",
      relatedEntityId: step.id,
      oncePerEntity: true,
    });
    await markRecommendationCompleted(req.studentId!, "assignment_step", step.id);

    const allSteps = await prisma.assignmentStep.findMany({ where: { assignmentId: assignment.id } });
    if (allSteps.length >= 2 && allSteps.every((s) => s.completed)) {
      const bonus = await awardXp(req.studentId!, XP_REASONS.COMPLETE_ALL_STEPS_BONUS, {
        actionType: XP_ACTIONS.COMPLETE_ALL_STEPS_BONUS,
        relatedEntityType: "assignment",
        relatedEntityId: assignment.id,
        oncePerEntity: true,
      });
      if (bonus) {
        xp = { amount: xp!.amount + bonus.amount, stars: xp!.stars + bonus.stars, unlocked: [...xp!.unlocked, ...bonus.unlocked] };
      }
    }
  }
  res.json({ step: updated, xp });
});
