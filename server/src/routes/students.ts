import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { getLevelInfo, getWeeklyStreak, XP_ACTIONS } from "../lib/xp";

export const studentsRouter = wrapAsync(Router());
studentsRouter.use(requireAuth);

studentsRouter.get("/me", async (req: AuthedRequest, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.studentId } });
  if (!student) return res.status(404).json({ error: "Not found" });

  const streak = await getWeeklyStreak(student.id);
  const achievementCount = await prisma.studentAchievement.count({ where: { studentId: student.id } });

  res.json({
    id: student.id,
    name: student.name,
    avatarConfig: JSON.parse(student.avatarConfig || "{}"),
    stars: student.stars,
    ...getLevelInfo(student.totalXp),
    streak,
    achievementCount,
  });
});

// Positive-milestone counts for the Rewards page's "Your Progress" strip.
// Computed on demand from existing records rather than a duplicated counter
// table — same philosophy as the XP ledger.
studentsRouter.get("/me/progress", async (req: AuthedRequest, res) => {
  const studentId = req.studentId!;
  const [assignmentsCompleted, assignmentStepsCompleted, focusSessionsCompleted, brainDumpEntriesProcessed, dailyCheckInsCompleted] =
    await Promise.all([
      prisma.assignment.count({ where: { studentId, status: "completed" } }),
      prisma.assignmentStep.count({ where: { completed: true, assignment: { studentId } } }),
      prisma.focusSession.count({ where: { studentId, completed: true } }),
      prisma.brainDumpEntry.count({ where: { studentId, status: "processed" } }),
      prisma.xPTransaction.count({ where: { studentId, actionType: XP_ACTIONS.DAILY_CHECKIN } }),
    ]);

  res.json({
    assignmentsCompleted,
    assignmentStepsCompleted,
    focusSessionsCompleted,
    brainDumpEntriesProcessed,
    dailyCheckInsCompleted,
  });
});

studentsRouter.patch("/me", async (req: AuthedRequest, res) => {
  const { name, avatarConfig } = req.body ?? {};
  const student = await prisma.student.update({
    where: { id: req.studentId },
    data: {
      ...(name ? { name: String(name) } : {}),
      ...(avatarConfig ? { avatarConfig: JSON.stringify(avatarConfig) } : {}),
    },
  });
  res.json({ ...student, avatarConfig: JSON.parse(student.avatarConfig || "{}") });
});
