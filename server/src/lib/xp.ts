import { prisma } from "../db";
import { dayKey } from "./dates";

// Level thresholds. Beyond the named table, levels keep incrementing with a
// flat 1200 XP gap and a generic "Legend N" name so progression never caps.
const LEVEL_TABLE = [
  { level: 1, name: "Rookie", xp: 0 },
  { level: 2, name: "Explorer", xp: 100 },
  { level: 3, name: "Trailblazer", xp: 250 },
  { level: 4, name: "Achiever", xp: 500 },
  { level: 5, name: "Champion", xp: 900 },
  { level: 6, name: "Mastermind", xp: 1400 },
  { level: 7, name: "Vanguard", xp: 2000 },
  { level: 8, name: "Luminary", xp: 2700 },
  { level: 9, name: "Virtuoso", xp: 3500 },
  { level: 10, name: "Legend", xp: 4500 },
];

export function getLevelInfo(totalXp: number) {
  let current = LEVEL_TABLE[0];
  let next: { level: number; name: string; xp: number } | null = LEVEL_TABLE[1] ?? null;

  for (let i = 0; i < LEVEL_TABLE.length; i++) {
    if (totalXp >= LEVEL_TABLE[i].xp) {
      current = LEVEL_TABLE[i];
      next = LEVEL_TABLE[i + 1] ?? null;
    }
  }

  // Extrapolate past the named table.
  if (!next && current.level === LEVEL_TABLE[LEVEL_TABLE.length - 1].level) {
    const last = LEVEL_TABLE[LEVEL_TABLE.length - 1];
    const levelsPast = Math.floor((totalXp - last.xp) / 1200);
    const extraLevel = last.level + levelsPast;
    const extraXp = last.xp + levelsPast * 1200;
    current = { level: extraLevel, name: extraLevel === last.level ? last.name : `Legend ${extraLevel - last.level}`, xp: extraXp };
    next = { level: extraLevel + 1, name: `Legend ${extraLevel - last.level + 1}`, xp: extraXp + 1200 };
  }

  const xpIntoLevel = totalXp - current.xp;
  const xpForNextLevel = next ? next.xp - current.xp : null;

  return {
    level: current.level,
    levelName: current.name,
    totalXp,
    xpIntoLevel,
    xpForNextLevel,
    nextLevelName: next?.name ?? null,
  };
}

// Human-readable `reason` strings double as the celebration toast's sub-label
// default. `XP_ACTIONS` below carries the stable machine key used for
// anti-farming idempotency checks and achievement predicates.
export const XP_REASONS = {
  ADD_ASSIGNMENT: "Added a quest",
  COMPLETE_STEP: "Completed a step",
  COMPLETE_ASSIGNMENT: "Completed a quest",
  COMPLETE_ALL_STEPS_BONUS: "Finished every step",
  FOCUS_SESSION: "Finished a focus session",
  START_FOCUS_SESSION: "Started a focus session",
  RESUME_TASK: "Got back on track",
  ROUTINE_ITEM: "Checked off a routine item",
  DAILY_CHECKIN: "Reviewed today's quests",
  REVIEW_UPCOMING: "Reviewed upcoming work",
  BRAIN_DUMP: "Captured a thought",
  PROCESS_BRAIN_DUMP: "Organized a thought",
  ADD_DUE_DATE: "Added a due date",
  SET_SUBJECT: "Organized by subject",
  BREAK_INTO_STEPS: "Broke it into steps",
  BACKPACK_CHECKLIST: "Prepped the backpack",
} as const;

export const XP_ACTIONS = {
  ADD_ASSIGNMENT: "ADD_ASSIGNMENT",
  COMPLETE_STEP: "COMPLETE_STEP",
  COMPLETE_ASSIGNMENT: "COMPLETE_ASSIGNMENT",
  COMPLETE_ALL_STEPS_BONUS: "COMPLETE_ALL_STEPS_BONUS",
  FOCUS_SESSION: "FOCUS_SESSION",
  START_FOCUS_SESSION: "START_FOCUS_SESSION",
  RESUME_TASK: "RESUME_TASK",
  ROUTINE_ITEM: "ROUTINE_ITEM",
  DAILY_CHECKIN: "DAILY_CHECKIN",
  REVIEW_UPCOMING: "REVIEW_UPCOMING",
  BRAIN_DUMP: "BRAIN_DUMP",
  PROCESS_BRAIN_DUMP: "PROCESS_BRAIN_DUMP",
  ADD_DUE_DATE: "ADD_DUE_DATE",
  SET_SUBJECT: "SET_SUBJECT",
  BREAK_INTO_STEPS: "BREAK_INTO_STEPS",
  BACKPACK_CHECKLIST: "BACKPACK_CHECKLIST",
} as const;

const XP_AMOUNTS: Record<string, number> = {
  [XP_REASONS.ADD_ASSIGNMENT]: 5,
  [XP_REASONS.COMPLETE_STEP]: 10,
  [XP_REASONS.COMPLETE_ASSIGNMENT]: 25,
  [XP_REASONS.COMPLETE_ALL_STEPS_BONUS]: 10,
  [XP_REASONS.FOCUS_SESSION]: 15,
  [XP_REASONS.START_FOCUS_SESSION]: 5,
  [XP_REASONS.RESUME_TASK]: 5,
  [XP_REASONS.ROUTINE_ITEM]: 5,
  [XP_REASONS.DAILY_CHECKIN]: 5,
  [XP_REASONS.REVIEW_UPCOMING]: 5,
  [XP_REASONS.BRAIN_DUMP]: 3,
  [XP_REASONS.PROCESS_BRAIN_DUMP]: 5,
  [XP_REASONS.ADD_DUE_DATE]: 3,
  [XP_REASONS.SET_SUBJECT]: 5,
  [XP_REASONS.BREAK_INTO_STEPS]: 5,
  [XP_REASONS.BACKPACK_CHECKLIST]: 5,
};

export interface AwardXpOptions {
  actionType?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  amountOverride?: number;
  /**
   * When true (and actionType + relatedEntityType + relatedEntityId are all
   * given), skips the award entirely if an XPTransaction with that exact
   * combination already exists. This is the one place anti-farming logic
   * lives — every route that wants a "once per assignment" / "once per day"
   * reward goes through this instead of re-implementing its own check.
   */
  oncePerEntity?: boolean;
}

export async function awardXp(studentId: string, reason: string, opts: AwardXpOptions = {}) {
  const { actionType, relatedEntityType, relatedEntityId, amountOverride, oncePerEntity } = opts;

  if (oncePerEntity && (!actionType || !relatedEntityType || !relatedEntityId)) {
    throw new Error("oncePerEntity requires actionType, relatedEntityType, and relatedEntityId");
  }

  const amount = amountOverride ?? XP_AMOUNTS[reason] ?? 5;
  const stars = Math.max(1, Math.round(amount / 2));

  try {
    await prisma.$transaction([
      prisma.xPTransaction.create({
        data: { studentId, amount, reason, actionType, relatedEntityType, relatedEntityId },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: { totalXp: { increment: amount }, stars: { increment: stars } },
      }),
    ]);
  } catch (err: any) {
    // Unique constraint hit (P2002): this exact (studentId, actionType,
    // relatedEntityType, relatedEntityId) was already awarded — including by
    // a second request that lost a race with this one. The DB constraint
    // makes this check atomic, unlike a separate find-then-create. Only
    // oncePerEntity awards tag all three fields, so only they can collide.
    if (oncePerEntity && err?.code === "P2002") return null;
    throw err;
  }

  await markActive(studentId);
  const unlocked = await checkAchievements(studentId);
  return { amount, stars, unlocked };
}

// Thin wrapper for "once a day" rewards (daily check-in, reviewing upcoming
// work, prepping the backpack) — reuses the same oncePerEntity mechanism by
// treating "today" as the entity.
export async function awardOncePerDay(studentId: string, reason: string, actionType: string) {
  return awardXp(studentId, reason, {
    actionType,
    relatedEntityType: "day",
    relatedEntityId: dayKey(),
    oncePerEntity: true,
  });
}

export async function markActive(studentId: string) {
  const date = dayKey();
  await prisma.activityDay.upsert({
    where: { studentId_date: { studentId, date } },
    update: {},
    create: { studentId, date },
  });
}

export async function getWeeklyStreak(studentId: string) {
  const days = await prisma.activityDay.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take: 7,
  });
  return { activeDaysLast7: days.length, days: days.map((d) => d.date) };
}

type AchievementPredicate = (studentId: string) => Promise<boolean>;

async function countActionType(studentId: string, actionType: string) {
  return prisma.xPTransaction.count({ where: { studentId, actionType } });
}

const ACHIEVEMENT_PREDICATES: Record<string, AchievementPredicate> = {
  first_quest: async (studentId) => {
    const count = await prisma.assignment.count({ where: { studentId, status: "completed" } });
    return count >= 1;
  },
  getting_organized: async (studentId) => {
    const count = await prisma.assignment.count({ where: { studentId } });
    return count >= 5;
  },
  focus_master: async (studentId) => {
    const count = await prisma.focusSession.count({ where: { studentId, completed: true } });
    return count >= 5;
  },
  breaking_it_down: async (studentId) => {
    const count = await prisma.assignment.count({
      where: { studentId, status: "completed", steps: { some: {} } },
    });
    return count >= 1;
  },
  big_finish: async (studentId) => {
    const assignments = await prisma.assignment.findMany({
      where: { studentId, status: "completed" },
      include: { steps: true },
    });
    return assignments.some((a) => a.steps.length >= 4 && a.steps.every((s) => s.completed));
  },
  ready_for_tomorrow: async (studentId) => {
    const count = await prisma.routineCompletion.count({
      where: { routineItem: { routine: { studentId, type: "evening" } } },
    });
    return count >= 1;
  },
  steady_week: async (studentId) => {
    const { activeDaysLast7 } = await getWeeklyStreak(studentId);
    return activeDaysLast7 >= 5;
  },
  brain_unloaded: async (studentId) => {
    const count = await prisma.brainDumpEntry.count({ where: { studentId } });
    return count >= 5;
  },
  sorted_it_out: async (studentId) => (await countActionType(studentId, XP_ACTIONS.PROCESS_BRAIN_DUMP)) >= 5,
  planner_pro: async (studentId) => (await countActionType(studentId, XP_ACTIONS.REVIEW_UPCOMING)) >= 5,
  step_planner: async (studentId) => (await countActionType(studentId, XP_ACTIONS.BREAK_INTO_STEPS)) >= 3,
  small_wins: async (studentId) => {
    const count = await prisma.assignmentStep.count({
      where: { completed: true, assignment: { studentId } },
    });
    return count >= 10;
  },
  looking_ahead: async (studentId) => (await countActionType(studentId, XP_ACTIONS.DAILY_CHECKIN)) >= 5,
  back_on_track: async (studentId) => (await countActionType(studentId, XP_ACTIONS.RESUME_TASK)) >= 1,
};

export async function checkAchievements(studentId: string): Promise<string[]> {
  const [catalog, unlockedKeys] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.studentAchievement
      .findMany({ where: { studentId }, select: { achievement: { select: { key: true } } } })
      .then((rows) => new Set(rows.map((r) => r.achievement.key))),
  ]);

  const newlyUnlocked: string[] = [];

  for (const achievement of catalog) {
    if (unlockedKeys.has(achievement.key)) continue;
    const predicate = ACHIEVEMENT_PREDICATES[achievement.key];
    if (!predicate) continue;
    if (await predicate(studentId)) {
      await prisma.studentAchievement.create({
        data: { studentId, achievementId: achievement.id },
      });
      newlyUnlocked.push(achievement.key);
    }
  }

  return newlyUnlocked;
}
