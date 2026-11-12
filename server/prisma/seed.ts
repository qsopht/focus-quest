import "dotenv/config";
import { prisma } from "../src/db";
import { awardXp, XP_ACTIONS, XP_REASONS, checkAchievements } from "../src/lib/xp";
import { addDays } from "../src/lib/dates";
import { ACHIEVEMENTS, REWARD_ITEMS } from "../src/lib/catalog";
import { DEFAULT_SUBJECTS, DEFAULT_ROUTINES, DEFAULT_CHECKLIST } from "../src/routes/auth";

async function main() {
  console.log("Resetting demo data...");
  await prisma.studentAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.studentRewardItem.deleteMany();
  await prisma.rewardItem.deleteMany();
  await prisma.student.deleteMany(); // cascades everything student-owned

  console.log("Seeding achievement + reward catalogs...");
  for (const a of ACHIEVEMENTS) await prisma.achievement.create({ data: a });
  for (const r of REWARD_ITEMS) await prisma.rewardItem.create({ data: r });

  console.log("Creating demo student 'Jordan'...");
  const student = await prisma.student.create({ data: { name: "Jordan" } });

  const subjects = await Promise.all(
    DEFAULT_SUBJECTS.map((s) => prisma.subject.create({ data: { ...s, studentId: student.id, isDefault: true } }))
  );
  const subjectId = (name: string) => subjects.find((s) => s.name === name)!.id;

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

  const checklistItems = await Promise.all(
    DEFAULT_CHECKLIST.map((label, order) =>
      prisma.checklistItem.create({ data: { studentId: student.id, label, order, isDefault: true } })
    )
  );
  await prisma.checklistItem.update({ where: { id: checklistItems[0].id }, data: { checked: true } });

  const now = new Date();
  const dueAt = (days: number, hour = 15) => {
    const d = addDays(now, days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  console.log("Creating calendar events...");
  await prisma.calendarEvent.createMany({
    data: [
      { studentId: student.id, title: "Math Quiz — Fractions", date: dueAt(3, 9), type: "quiz" },
      { studentId: student.id, title: "Science Unit Test", date: dueAt(9, 9), type: "test" },
      { studentId: student.id, title: "Picture Day", date: dueAt(6, 8), type: "event" },
    ],
  });

  console.log("Creating quests...");

  // Overdue, shown calmly as "catch up" rather than alarming.
  const overdue = await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("English"),
      title: "Reading log — Chapter 3",
      estimatedMinutes: 15,
      dueDate: dueAt(-1),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  // Due today.
  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Math"),
      title: "Math worksheet — Fractions",
      estimatedMinutes: 10,
      dueDate: dueAt(0),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Science"),
      title: "Science reading — Cells",
      estimatedMinutes: 15,
      dueDate: dueAt(0),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  // This week.
  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Foreign Language"),
      title: "Spanish vocab quiz prep",
      estimatedMinutes: 20,
      dueDate: dueAt(3),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  const historyProject = await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Social Studies"),
      title: "History project — Ancient Egypt",
      notes: "Trifold board presentation, due at the end of the week.",
      priority: "high",
      estimatedMinutes: 120,
      dueDate: dueAt(4),
      steps: {
        create: [
          { title: "Choose a topic", order: 0, completed: true, completedAt: addDays(now, -3) },
          { title: "Research the topic", order: 1, completed: true, completedAt: addDays(now, -1) },
          { title: "Write an outline", order: 2 },
          { title: "Complete the first draft", order: 3 },
          { title: "Create presentation", order: 4 },
          { title: "Submit project", order: 5 },
        ],
      },
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);
  await awardXp(student.id, XP_REASONS.COMPLETE_STEP);
  await awardXp(student.id, XP_REASONS.COMPLETE_STEP);

  // Upcoming.
  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("English"),
      title: "Book report — Hatchet",
      estimatedMinutes: 45,
      dueDate: dueAt(12),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Science"),
      title: "Science Fair project",
      priority: "high",
      estimatedMinutes: 180,
      dueDate: dueAt(20),
      steps: {
        create: [
          { title: "Choose a topic", order: 0 },
          { title: "Research the topic", order: 1 },
          { title: "Write an outline", order: 2 },
          { title: "Complete the first draft", order: 3 },
          { title: "Create presentation", order: 4 },
          { title: "Submit project", order: 5 },
        ],
      },
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);

  // Completed history.
  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Art"),
      title: "Art sketch assignment",
      status: "completed",
      completedAt: addDays(now, -2),
      dueDate: addDays(now, -2),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);
  await awardXp(student.id, XP_REASONS.COMPLETE_ASSIGNMENT);

  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("PE"),
      title: "PE fitness log",
      status: "completed",
      completedAt: addDays(now, -3),
      dueDate: addDays(now, -3),
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);
  await awardXp(student.id, XP_REASONS.COMPLETE_ASSIGNMENT);

  // Completed multi-step (unlocks "Breaking It Down").
  await prisma.assignment.create({
    data: {
      studentId: student.id,
      subjectId: subjectId("Math"),
      title: "Worksheet — algebra review",
      status: "completed",
      completedAt: addDays(now, -1),
      dueDate: addDays(now, -1),
      steps: {
        create: [
          { title: "Review the examples", order: 0, completed: true, completedAt: addDays(now, -1) },
          { title: "Work through the problems", order: 1, completed: true, completedAt: addDays(now, -1) },
          { title: "Check your answers", order: 2, completed: true, completedAt: addDays(now, -1) },
        ],
      },
    },
  });
  await awardXp(student.id, XP_REASONS.ADD_ASSIGNMENT);
  await awardXp(student.id, XP_REASONS.COMPLETE_STEP);
  await awardXp(student.id, XP_REASONS.COMPLETE_STEP);
  await awardXp(student.id, XP_REASONS.COMPLETE_STEP);
  await awardXp(student.id, XP_REASONS.COMPLETE_ASSIGNMENT);

  console.log("Creating focus session history (unlocks Focus Master)...");
  for (let i = 0; i < 5; i++) {
    const startedAt = addDays(now, -i - 1);
    await prisma.focusSession.create({
      data: {
        studentId: student.id,
        durationMinutes: 10,
        elapsedSeconds: 600,
        completed: true,
        startedAt,
        endedAt: startedAt,
      },
    });
    await awardXp(student.id, XP_REASONS.FOCUS_SESSION);
  }

  console.log("Seeding brain dump entries...");
  const teacherNote = await prisma.brainDumpEntry.create({
    data: { studentId: student.id, text: "Ask Ms. Lee about extra credit" },
  });
  await prisma.brainDumpEntry.create({ data: { studentId: student.id, text: "Don't forget the field trip permission slip" } });
  await prisma.brainDumpEntry.create({ data: { studentId: student.id, text: "Bring gym clothes tomorrow" } });
  await prisma.brainDumpEntry.create({ data: { studentId: student.id, text: "Finish the science worksheet" } });

  // Demonstrate the "processed" state: this one was already turned into a reminder.
  const teacherReminder = await prisma.reminder.create({
    data: { studentId: student.id, message: teacherNote.text, remindAt: dueAt(1, 8), kind: "custom" },
  });
  await prisma.brainDumpEntry.update({
    where: { id: teacherNote.id },
    data: { status: "processed", convertedItemType: "reminder", convertedItemId: teacherReminder.id },
  });
  await awardXp(student.id, XP_REASONS.PROCESS_BRAIN_DUMP, {
    actionType: XP_ACTIONS.PROCESS_BRAIN_DUMP,
    relatedEntityType: "brain_dump",
    relatedEntityId: teacherNote.id,
    oncePerEntity: true,
  });

  console.log("Backfilling recent activity days (unlocks Steady Week)...");
  for (let i = 0; i < 5; i++) {
    const date = addDays(now, -i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    await prisma.activityDay.upsert({
      where: { studentId_date: { studentId: student.id, date: key } },
      update: {},
      create: { studentId: student.id, date: key },
    });
  }

  await checkAchievements(student.id);

  console.log("Reminders...");
  await prisma.reminder.create({
    data: {
      studentId: student.id,
      message: "Science reading is due tomorrow.",
      remindAt: dueAt(0, 16),
      kind: "due",
      assignmentId: overdue.id,
    },
  });

  const finalStudent = await prisma.student.findUnique({ where: { id: student.id } });
  console.log(`Done! Demo student "Jordan" has ${finalStudent?.totalXp} XP and ${finalStudent?.stars} stars.`);
  console.log(`History project id (for manual testing): ${historyProject.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
