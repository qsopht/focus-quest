import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";

export const remindersRouter = Router();
remindersRouter.use(requireAuth);

remindersRouter.get("/", async (req: AuthedRequest, res) => {
  const reminders = await prisma.reminder.findMany({
    where: { studentId: req.studentId, dismissed: false },
    orderBy: { remindAt: "asc" },
    include: { assignment: { select: { title: true } } },
  });
  res.json(reminders);
});

remindersRouter.post("/", async (req: AuthedRequest, res) => {
  const { message, remindAt, kind, assignmentId } = req.body ?? {};
  if (!message || !remindAt) return res.status(400).json({ error: "message and remindAt are required" });
  const reminder = await prisma.reminder.create({
    data: {
      studentId: req.studentId!,
      message: String(message),
      remindAt: new Date(remindAt),
      kind: kind || "custom",
      assignmentId: assignmentId || null,
    },
  });
  res.status(201).json(reminder);
});

remindersRouter.post("/:id/dismiss", async (req: AuthedRequest, res) => {
  await prisma.reminder.updateMany({
    where: { id: req.params.id, studentId: req.studentId },
    data: { dismissed: true },
  });
  res.status(204).end();
});

remindersRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.reminder.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
