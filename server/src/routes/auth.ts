import { Router } from "express";
import { prisma } from "../db";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

export const DEFAULT_SUBJECTS = [
  { name: "Math", color: "#6366f1", icon: "calculator" },
  { name: "Science", color: "#10b981", icon: "flask" },
  { name: "English", color: "#f59e0b", icon: "book-open" },
  { name: "Social Studies", color: "#ef4444", icon: "globe" },
  { name: "Foreign Language", color: "#ec4899", icon: "message-circle" },
  { name: "Art", color: "#a855f7", icon: "palette" },
  { name: "PE", color: "#06b6d4", icon: "dumbbell" },
  { name: "Other", color: "#64748b", icon: "star" },
];

export const DEFAULT_ROUTINES: { type: string; name: string; items: string[] }[] = [
  { type: "morning", name: "Morning Launch", items: ["Check today's quests", "Pack backpack", "Grab any signed forms"] },
  { type: "afterschool", name: "After School Reset", items: ["Review assignments", "Pick what to work on first", "Do homework"] },
  { type: "evening", name: "Evening Wind-down", items: ["Check tomorrow's schedule", "Pack backpack", "Confirm work is submitted"] },
];

export const DEFAULT_CHECKLIST = ["Chromebook", "Charger", "Homework folder", "Water bottle"];

// List existing quick-login profiles.
authRouter.get("/profiles", async (_req, res) => {
  const students = await prisma.student.findMany({
    select: { id: true, name: true, avatarConfig: true, totalXp: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(students);
});

// Create a brand-new profile (no password — this is a shared-device, low-friction login).
authRouter.post("/profiles", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name is required" });

  const student = await prisma.student.create({ data: { name } });

  await prisma.subject.createMany({
    data: DEFAULT_SUBJECTS.map((s) => ({ ...s, studentId: student.id, isDefault: true })),
  });

  for (const routine of DEFAULT_ROUTINES) {
    await prisma.routine.create({
      data: {
        studentId: student.id,
        type: routine.type,
        name: routine.name,
        items: { create: routine.items.map((title, order) => ({ title, order })) },
      },
    });
  }

  await prisma.checklistItem.createMany({
    data: DEFAULT_CHECKLIST.map((label, order) => ({ studentId: student.id, label, isDefault: true, order })),
  });

  const token = signToken(student.id);
  res.status(201).json({ token, student });
});

authRouter.post("/login", async (req, res) => {
  const studentId = String(req.body?.studentId || "");
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return res.status(404).json({ error: "Profile not found" });
  const token = signToken(student.id);
  res.json({ token, student });
});
