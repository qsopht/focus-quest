import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardXp, XP_ACTIONS, XP_REASONS } from "../lib/xp";
import { parseDateInput, addDays } from "../lib/dates";
import { suggestCategory } from "../lib/brainDumpHeuristics";

export const brainDumpRouter = wrapAsync(Router());
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
  const xp = await awardXp(req.studentId!, XP_REASONS.BRAIN_DUMP, {
    actionType: XP_ACTIONS.BRAIN_DUMP,
    relatedEntityType: "brain_dump",
    relatedEntityId: entry.id,
    oncePerEntity: true,
  });
  res.status(201).json({ entry, xp });
});

brainDumpRouter.get("/:id/suggest-category", async (req: AuthedRequest, res) => {
  const entry = await prisma.brainDumpEntry.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!entry) return res.status(404).json({ error: "Not found" });
  res.json(suggestCategory(entry.text));
});

async function findUnsortedEntry(studentId: string, id: string) {
  return prisma.brainDumpEntry.findFirst({ where: { id, studentId, status: "unsorted" } });
}

async function markProcessed(studentId: string, entryId: string, convertedItemType: string, convertedItemId: string | null) {
  await prisma.brainDumpEntry.update({
    where: { id: entryId },
    data: { status: "processed", convertedItemType, convertedItemId },
  });
  return awardXp(studentId, XP_REASONS.PROCESS_BRAIN_DUMP, {
    actionType: XP_ACTIONS.PROCESS_BRAIN_DUMP,
    relatedEntityType: "brain_dump",
    relatedEntityId: entryId,
    oncePerEntity: true,
  });
}

brainDumpRouter.post("/:id/convert-to-assignment", async (req: AuthedRequest, res) => {
  const entry = await findUnsortedEntry(req.studentId!, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });

  const { subjectId, dueDate } = req.body ?? {};
  const assignment = await prisma.assignment.create({
    data: {
      studentId: req.studentId!,
      title: entry.text.slice(0, 120),
      subjectId: subjectId || null,
      dueDate: dueDate ? parseDateInput(dueDate) : null,
    },
    include: { subject: true, steps: true },
  });

  const assignmentXp = await awardXp(req.studentId!, XP_REASONS.ADD_ASSIGNMENT, {
    actionType: XP_ACTIONS.ADD_ASSIGNMENT,
    relatedEntityType: "assignment",
    relatedEntityId: assignment.id,
    oncePerEntity: true,
  });
  const processXp = await markProcessed(req.studentId!, entry.id, "assignment", assignment.id);

  res.status(201).json({ assignment, xp: processXp ?? assignmentXp });
});

brainDumpRouter.post("/:id/convert-to-reminder", async (req: AuthedRequest, res) => {
  const entry = await findUnsortedEntry(req.studentId!, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });

  const remindAt = req.body?.remindAt ? parseDateInput(req.body.remindAt) : addDays(new Date(), 1);
  const reminder = await prisma.reminder.create({
    data: { studentId: req.studentId!, message: entry.text, remindAt, kind: "custom" },
  });
  const xp = await markProcessed(req.studentId!, entry.id, "reminder", reminder.id);
  res.status(201).json({ reminder, xp });
});

brainDumpRouter.post("/:id/convert-to-event", async (req: AuthedRequest, res) => {
  const entry = await findUnsortedEntry(req.studentId!, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });

  const date = req.body?.date ? parseDateInput(req.body.date) : addDays(new Date(), 1);
  const event = await prisma.calendarEvent.create({
    data: { studentId: req.studentId!, title: entry.text.slice(0, 120), date, type: req.body?.type || "event" },
  });
  const xp = await markProcessed(req.studentId!, entry.id, "calendar_event", event.id);
  res.status(201).json({ event, xp });
});

brainDumpRouter.post("/:id/convert-to-checklist", async (req: AuthedRequest, res) => {
  const entry = await findUnsortedEntry(req.studentId!, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });

  const count = await prisma.checklistItem.count({ where: { studentId: req.studentId } });
  const item = await prisma.checklistItem.create({
    data: { studentId: req.studentId!, label: entry.text.slice(0, 120), order: count },
  });
  const xp = await markProcessed(req.studentId!, entry.id, "checklist_item", item.id);
  res.status(201).json({ item, xp });
});

brainDumpRouter.post("/:id/keep-as-note", async (req: AuthedRequest, res) => {
  const entry = await findUnsortedEntry(req.studentId!, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  const xp = await markProcessed(req.studentId!, entry.id, "note", null);
  res.json({ ok: true, xp });
});

brainDumpRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.brainDumpEntry.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
