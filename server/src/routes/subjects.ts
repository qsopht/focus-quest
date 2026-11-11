import { Router } from "express";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";

export const subjectsRouter = Router();
subjectsRouter.use(requireAuth);

subjectsRouter.get("/", async (req: AuthedRequest, res) => {
  const subjects = await prisma.subject.findMany({
    where: { studentId: req.studentId },
    orderBy: { createdAt: "asc" },
  });
  res.json(subjects);
});

subjectsRouter.post("/", async (req: AuthedRequest, res) => {
  const { name, color, icon } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const subject = await prisma.subject.create({
    data: {
      studentId: req.studentId!,
      name: String(name),
      color: color || "#64748b",
      icon: icon || "star",
    },
  });
  res.status(201).json(subject);
});

subjectsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await prisma.subject.deleteMany({ where: { id: req.params.id, studentId: req.studentId } });
  res.status(204).end();
});
