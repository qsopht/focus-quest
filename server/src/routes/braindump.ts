import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_REASONS } from "../lib/xp";

export const brainDumpRouter = Router();
brainDumpRouter.use(requireAuth);

brainDumpRouter.get("/", async (req: AuthedRequest, res) => {
  const entries = await prisma.brainDumpEntry.findMany({
    where: { studentId: req.studentId },
    orderBy: { createdAt: "desc" },
  });
  res.json(entries);
});

brainDumpRouter.post("/", async (req: AuthedRequest, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Text is required" });
  const entry = await prisma.brainDumpEntry.create({ data: { studentId: req.studentId!, text } });
  const xp = await awardXp(req.studentId!, XP_REASONS.BRAIN_DUMP);
  res.status(201).json({ entry, xp });
});

brainDumpRouter.post("/:id/convert", async (req: AuthedRequest, res) => {
  const entry = await prisma.brainDumpEntry.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!entry) return res.status(404).json({ error: "Not found" });

  const assignment = await prisma.assignment.create({
    data: { studentId: req.studentId!, title: entry.text.slice(0, 120) },
  });
  await prisma.brainDumpEntry.update({
    where: { id: entry.id },
    data: { convertedToAssignmentId: assignment.id },
  });

  res.status(201).json({ assignment });
});

brainDumpRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.brainDumpEntry.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
