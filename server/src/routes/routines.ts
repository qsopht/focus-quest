import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_REASONS } from "../lib/xp";
import { dayKey } from "../lib/dates";

export const routinesRouter = wrapAsync(Router());
routinesRouter.use(requireAuth);

routinesRouter.get("/", async (req: AuthedRequest, res) => {
  const today = dayKey();
  const routines = await prisma.routine.findMany({
    where: { studentId: req.studentId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { completions: { where: { date: today } } },
      },
    },
  });

  res.json(
    routines.map((r) => ({
      ...r,
      items: r.items.map((item) => ({
        id: item.id,
        title: item.title,
        order: item.order,
        completedToday: item.completions.length > 0,
      })),
    }))
  );
});

routinesRouter.post("/", async (req: AuthedRequest, res) => {
  const { type, name } = req.body ?? {};
  if (!type || !name) return res.status(400).json({ error: "type and name are required" });
  const routine = await prisma.routine.create({ data: { studentId: req.studentId!, type, name } });
  res.status(201).json(routine);
});

routinesRouter.post("/:id/items", async (req: AuthedRequest, res) => {
  const routine = await prisma.routine.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!routine) return res.status(404).json({ error: "Not found" });
  const count = await prisma.routineItem.count({ where: { routineId: routine.id } });
  const item = await prisma.routineItem.create({
    data: { routineId: routine.id, title: String(req.body?.title || "").trim(), order: count },
  });
  res.status(201).json(item);
});

routinesRouter.delete("/items/:itemId", async (req: AuthedRequest, res) => {
  const item = await prisma.routineItem.findFirst({
    where: { id: req.params.itemId, routine: { studentId: req.studentId } },
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  await prisma.routineItem.delete({ where: { id: item.id } });
  res.status(204).end();
});

routinesRouter.post("/items/:itemId/complete", async (req: AuthedRequest, res) => {
  const item = await prisma.routineItem.findFirst({
    where: { id: req.params.itemId, routine: { studentId: req.studentId } },
    include: { completions: true },
  });
  if (!item) return res.status(404).json({ error: "Not found" });

  const today = dayKey();
  const already = await prisma.routineCompletion.findUnique({
    where: { routineItemId_date: { routineItemId: item.id, date: today } },
  });

  let xp = null;
  if (already) {
    await prisma.routineCompletion.delete({ where: { id: already.id } });
  } else {
    await prisma.routineCompletion.create({ data: { routineItemId: item.id, date: today } });
    xp = await awardXp(req.studentId!, XP_REASONS.ROUTINE_ITEM);
  }

  res.json({ completedToday: !already, xp });
});
