import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { getLevelInfo, getWeeklyStreak } from "../lib/xp";

export const studentsRouter = Router();
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
