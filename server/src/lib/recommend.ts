import { prisma } from "../db";
import { startOfDay, endOfDay } from "./dates";
import { suggestCategory } from "./brainDumpHeuristics";

export type RecommendationMode = "normal" | "easier";

export interface RecommendationExcludes {
  assignmentIds?: string[];
  stepIds?: string[];
  brainDumpIds?: string[];
}

export type Recommendation =
  | {
      type: "assignment_step";
      assignmentId: string;
      stepId: string;
      title: string;
      assignmentTitle: string;
      subject: { name: string; color: string; icon: string } | null;
      estimatedMinutes: number;
      reason: string;
    }
  | {
      type: "assignment";
      assignmentId: string;
      title: string;
      subject: { name: string; color: string; icon: string } | null;
      estimatedMinutes: number;
      needsBreakdown: boolean;
      allStepsDone: boolean;
      reason: string;
    }
  | {
      type: "brain_dump";
      brainDumpId: string;
      text: string;
      suggestedCategory: ReturnType<typeof suggestCategory>["category"];
      reason: string;
    }
  | {
      type: "organizational";
      action: "add_due_date" | "organize_brain_dump" | "pack_item";
      entityId: string;
      title: string;
      reason: string;
    }
  | { type: "all_caught_up" };

const PRESETS = [5, 10, 15, 20];
export function nearestPreset(minutes: number): number {
  for (const p of PRESETS) if (minutes <= p) return p;
  return PRESETS[PRESETS.length - 1];
}

function dayDiff(due: Date, now: Date): number {
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86400000);
}

function urgencyScore(dueDate: Date | null, now: Date): number {
  if (!dueDate) return 5;
  const diff = dayDiff(dueDate, now);
  if (diff < 0) return 100;
  if (diff === 0) return 80;
  if (diff === 1) return 60;
  if (diff <= 7) return 30;
  return 10;
}

function urgencyReason(dueDate: Date | null, now: Date): string | null {
  if (!dueDate) return null;
  const diff = dayDiff(dueDate, now);
  if (diff < 0) return "This is already past due.";
  if (diff === 0) return "This is due today.";
  if (diff === 1) return "This is due tomorrow.";
  if (diff <= 7) return `This is due ${dueDate.toLocaleDateString("en-US", { weekday: "long" })}.`;
  return null;
}

function effortScore(estimatedMinutes: number): number {
  if (estimatedMinutes <= 5) return 30;
  if (estimatedMinutes <= 15) return 20;
  if (estimatedMinutes <= 30) return 10;
  return 0;
}

const PRIORITY_SCORE: Record<string, number> = { high: 10, medium: 5, low: 0 };

interface Candidate {
  score: number;
  recommendation: Recommendation;
}

export async function buildRecommendation(
  studentId: string,
  mode: RecommendationMode = "normal",
  excludes: RecommendationExcludes = {}
): Promise<Recommendation> {
  const excludeAssignmentIds = new Set(excludes.assignmentIds ?? []);
  const excludeStepIds = new Set(excludes.stepIds ?? []);
  const excludeBrainDumpIds = new Set(excludes.brainDumpIds ?? []);
  const now = new Date();

  const [assignments, brainDumpEntries, checklistItems] = await Promise.all([
    prisma.assignment.findMany({
      where: { studentId, status: "active" },
      include: { subject: true, steps: { orderBy: { order: "asc" } } },
    }),
    prisma.brainDumpEntry.findMany({ where: { studentId, status: "unsorted" }, orderBy: { createdAt: "asc" } }),
    prisma.checklistItem.findMany({ where: { studentId, checked: false }, orderBy: { order: "asc" } }),
  ]);

  if (assignments.length === 0 && brainDumpEntries.length === 0) {
    return { type: "all_caught_up" };
  }

  const todayCompletedCount = await prisma.assignment.count({
    where: { studentId, status: "completed", completedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
  });
  const effortWeight = todayCompletedCount >= 3 ? 1.6 : 1;

  const candidates: Candidate[] = [];
  const subjectInfo = (a: (typeof assignments)[number]) =>
    a.subject ? { name: a.subject.name, color: a.subject.color, icon: a.subject.icon } : null;

  for (const a of assignments) {
    if (excludeAssignmentIds.has(a.id)) continue;
    const incompleteSteps = a.steps.filter((s) => !s.completed);
    const startedBonus = a.steps.some((s) => s.completed) ? 15 : 0;
    const priorityBonus = PRIORITY_SCORE[a.priority] ?? 0;
    const urgency = urgencyScore(a.dueDate, now);
    const urgencyText = urgencyReason(a.dueDate, now);

    if (incompleteSteps.length > 0) {
      const nextStep = incompleteSteps[0];
      if (excludeStepIds.has(nextStep.id)) continue;
      const estimate = a.estimatedMinutes
        ? Math.max(5, Math.round(a.estimatedMinutes / a.steps.length / 5) * 5)
        : 10;
      const effort = effortScore(estimate) * effortWeight;
      const reason =
        urgencyText ?? (startedBonus ? "You've already started this one." : "This is a good place to start.");
      candidates.push({
        score: urgency + effort + startedBonus + priorityBonus,
        recommendation: {
          type: "assignment_step",
          assignmentId: a.id,
          stepId: nextStep.id,
          title: nextStep.title,
          assignmentTitle: a.title,
          subject: subjectInfo(a),
          estimatedMinutes: nearestPreset(estimate),
          reason,
        },
      });
    } else {
      const allStepsDone = a.steps.length > 0;
      const estimate = allStepsDone ? 5 : a.estimatedMinutes ?? 20;
      const needsBreakdown = !allStepsDone && (a.estimatedMinutes == null || a.estimatedMinutes > 20);
      const effort = effortScore(estimate) * effortWeight - (needsBreakdown ? 15 : 0);
      const reason = allStepsDone
        ? "You've finished every step — this is ready to mark complete!"
        : urgencyText ??
          (needsBreakdown ? "Let's break this big one into smaller pieces." : "This is a quick one you can finish.");
      candidates.push({
        score: urgency + effort + startedBonus + priorityBonus,
        recommendation: {
          type: "assignment",
          assignmentId: a.id,
          title: a.title,
          subject: subjectInfo(a),
          estimatedMinutes: nearestPreset(estimate),
          needsBreakdown,
          allStepsDone,
          reason,
        },
      });
    }
  }

  for (const entry of brainDumpEntries) {
    if (excludeBrainDumpIds.has(entry.id)) continue;
    const suggestion = suggestCategory(entry.text);
    const categoryBonus = suggestion.category === "checklist" ? 5 : suggestion.category === "note" ? 0 : 10;
    candidates.push({
      score: 15 + categoryBonus,
      recommendation: {
        type: "brain_dump",
        brainDumpId: entry.id,
        text: entry.text,
        suggestedCategory: suggestion.category,
        reason: suggestion.label,
      },
    });
  }

  if (mode === "easier") {
    const small = candidates.filter((c) => {
      const r = c.recommendation;
      if (r.type === "assignment_step" || r.type === "assignment") return r.estimatedMinutes <= 10;
      return true; // brain_dump entries are always a quick, easy win
    });
    if (small.length > 0) {
      small.sort((a, b) => b.score - a.score);
      return small[0].recommendation;
    }

    // Organizational fallbacks, in order of "most likely to help right now."
    const noDueDate = assignments.find((a) => !a.dueDate && !excludeAssignmentIds.has(a.id));
    if (noDueDate) {
      return {
        type: "organizational",
        action: "add_due_date",
        entityId: noDueDate.id,
        title: noDueDate.title,
        reason: "Giving this a due date makes it easier to plan around.",
      };
    }
    const anyBrainDump = brainDumpEntries.find((e) => !excludeBrainDumpIds.has(e.id));
    if (anyBrainDump) {
      return {
        type: "organizational",
        action: "organize_brain_dump",
        entityId: anyBrainDump.id,
        title: anyBrainDump.text,
        reason: "Let's clear one thing off your Brain Dump list.",
      };
    }
    const anyChecklistItem = checklistItems[0];
    if (anyChecklistItem) {
      return {
        type: "organizational",
        action: "pack_item",
        entityId: anyChecklistItem.id,
        title: anyChecklistItem.label,
        reason: "A tiny win: get this ready for tomorrow.",
      };
    }
  }

  if (candidates.length === 0) {
    return { type: "all_caught_up" };
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].recommendation;
}

// Best-effort: if this completion matches the most recent accepted-but-not-yet-completed
// recommendation for the same entity, mark it completed. Never blocks the caller.
export async function markRecommendationCompleted(
  studentId: string,
  recommendedEntityType: string,
  recommendedEntityId: string
) {
  const match = await prisma.recommendationHistory.findFirst({
    where: { studentId, recommendedEntityType, recommendedEntityId, accepted: true, completed: null },
    orderBy: { createdAt: "desc" },
  });
  if (match) {
    await prisma.recommendationHistory.update({ where: { id: match.id }, data: { completed: true } });
  }
}
