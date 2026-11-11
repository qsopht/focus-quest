import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";

export const checklistRouter = Router();
checklistRouter.use(requireAuth);

checklistRouter.get("/", async (req: AuthedRequest, res) => {
  const items = await prisma.checklistItem.findMany({
    where: { studentId: req.studentId },
    orderBy: { order: "asc" },
  });
  res.json(items);
});

checklistRouter.post("/", async (req: AuthedRequest, res) => {
  const label = String(req.body?.label || "").trim();
  if (!label) return res.status(400).json({ error: "Label is required" });
  const count = await prisma.checklistItem.count({ where: { studentId: req.studentId } });
  const item = await prisma.checklistItem.create({
    data: { studentId: req.studentId!, label, order: count },
  });
  res.status(201).json(item);
});

checklistRouter.post("/:id/toggle", async (req: AuthedRequest, res) => {
  const item = await prisma.checklistItem.findFirst({ where: { id: req.params.id, studentId: req.studentId } });
  if (!item) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.checklistItem.update({ where: { id: item.id }, data: { checked: !item.checked } });
  res.json(updated);
});

checklistRouter.post("/reset", async (req: AuthedRequest, res) => {
  await prisma.checklistItem.updateMany({ where: { studentId: req.studentId }, data: { checked: false } });
  res.status(204).end();
});

checklistRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.checklistItem.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
