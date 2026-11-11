import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";

export const rewardsRouter = Router();
rewardsRouter.use(requireAuth);

rewardsRouter.get("/", async (req: AuthedRequest, res) => {
  const [catalog, owned, student] = await Promise.all([
    prisma.rewardItem.findMany(),
    prisma.studentRewardItem.findMany({ where: { studentId: req.studentId } }),
    prisma.student.findUnique({ where: { id: req.studentId } }),
  ]);

  const ownedMap = new Map(owned.map((o) => [o.rewardItemId, o]));

  res.json({
    stars: student?.stars ?? 0,
    items: catalog.map((item) => ({
      ...item,
      owned: ownedMap.has(item.id),
      equipped: ownedMap.get(item.id)?.equipped ?? false,
    })),
  });
});

rewardsRouter.post("/:id/purchase", async (req: AuthedRequest, res) => {
  const item = await prisma.rewardItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Not found" });

  const student = await prisma.student.findUnique({ where: { id: req.studentId } });
  if (!student) return res.status(404).json({ error: "Not found" });

  const already = await prisma.studentRewardItem.findUnique({
    where: { studentId_rewardItemId: { studentId: student.id, rewardItemId: item.id } },
  });
  if (already) return res.status(400).json({ error: "Already owned" });

  if (student.stars < item.cost) return res.status(400).json({ error: "Not enough stars yet" });

  await prisma.$transaction([
    prisma.student.update({ where: { id: student.id }, data: { stars: { decrement: item.cost } } }),
    prisma.studentRewardItem.create({ data: { studentId: student.id, rewardItemId: item.id } }),
  ]);

  res.status(201).json({ ok: true });
});

rewardsRouter.post("/:id/equip", async (req: AuthedRequest, res) => {
  const owned = await prisma.studentRewardItem.findUnique({
    where: { studentId_rewardItemId: { studentId: req.studentId!, rewardItemId: req.params.id } },
    include: { rewardItem: true },
  });
  if (!owned) return res.status(400).json({ error: "You don't own this yet" });

  // Unequip anything else in the same category, then equip this one.
  await prisma.$transaction([
    prisma.studentRewardItem.updateMany({
      where: {
        studentId: req.studentId!,
        equipped: true,
        rewardItem: { category: owned.rewardItem.category },
      },
      data: { equipped: false },
    }),
    prisma.studentRewardItem.update({ where: { id: owned.id }, data: { equipped: true } }),
  ]);

  res.json({ ok: true });
});

rewardsRouter.post("/:id/unequip", async (req: AuthedRequest, res) => {
  await prisma.studentRewardItem.updateMany({
    where: { studentId: req.studentId!, rewardItemId: req.params.id },
    data: { equipped: false },
  });
  res.json({ ok: true });
});
