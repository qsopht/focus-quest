import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";

export const achievementsRouter = Router();
achievementsRouter.use(requireAuth);

achievementsRouter.get("/", async (req: AuthedRequest, res) => {
  const [catalog, unlocked] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.studentAchievement.findMany({ where: { studentId: req.studentId } }),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  res.json(
    catalog.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }))
  );
});
