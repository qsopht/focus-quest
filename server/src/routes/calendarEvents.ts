import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { parseDateInput } from "../lib/dates";

export const calendarEventsRouter = wrapAsync(Router());
calendarEventsRouter.use(requireAuth);

calendarEventsRouter.get("/", async (req: AuthedRequest, res) => {
  const events = await prisma.calendarEvent.findMany({
    where: { studentId: req.studentId },
    orderBy: { date: "asc" },
  });
  res.json(events);
});

calendarEventsRouter.post("/", async (req: AuthedRequest, res) => {
  const { title, date, type } = req.body ?? {};
  if (!title || !date) return res.status(400).json({ error: "title and date are required" });
  const event = await prisma.calendarEvent.create({
    data: { studentId: req.studentId!, title: String(title), date: parseDateInput(date), type: type || "event" },
  });
  res.status(201).json(event);
});

calendarEventsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { title, date, type } = req.body ?? {};
  const event = await prisma.calendarEvent.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(date !== undefined ? { date: parseDateInput(date) } : {}),
      ...(type !== undefined ? { type } : {}),
    },
  });
  res.json(event);
});

calendarEventsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.calendarEvent.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
