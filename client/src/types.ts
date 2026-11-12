export interface Student {
  id: string;
  name: string;
  avatarConfig: Record<string, string>;
}

export interface MeSummary {
  id: string;
  name: string;
  avatarConfig: Record<string, string>;
  stars: number;
  level: number;
  levelName: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  nextLevelName: string | null;
  streak: { activeDaysLast7: number; days: string[] };
  achievementCount: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface AssignmentStep {
  id: string;
  assignmentId: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
}

export interface Assignment {
  id: string;
  studentId: string;
  subjectId: string | null;
  subject: Subject | null;
  title: string;
  notes: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  priority: "low" | "medium" | "high";
  status: "active" | "completed";
  completedAt: string | null;
  createdAt: string;
  steps: AssignmentStep[];
  friendlyDue: string;
}

export interface XpAward {
  amount: number;
  stars: number;
  unlocked: string[];
}

export interface FocusSession {
  id: string;
  assignmentId: string | null;
  durationMinutes: number;
  elapsedSeconds: number;
  completed: boolean;
  startedAt: string;
  endedAt: string | null;
}

export interface RoutineItem {
  id: string;
  title: string;
  order: number;
  completedToday: boolean;
}

export interface Routine {
  id: string;
  type: "morning" | "afterschool" | "evening";
  name: string;
  items: RoutineItem[];
}

export interface Reminder {
  id: string;
  message: string;
  remindAt: string;
  kind: string;
  dismissed: boolean;
  assignment?: { title: string } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "test" | "quiz" | "project" | "event";
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface RewardItem {
  id: string;
  key: string;
  name: string;
  category: "hat" | "outfit" | "accessory" | "background" | "theme";
  cost: number;
  assetRef: string;
  owned: boolean;
  equipped: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  isDefault: boolean;
  order: number;
}

export interface BrainDumpEntry {
  id: string;
  text: string;
  status: "unsorted" | "processed" | "archived";
  convertedItemType: "assignment" | "reminder" | "calendar_event" | "checklist_item" | "note" | null;
  convertedItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySuggestion {
  category: "assignment" | "reminder" | "checklist" | "note";
  label: string;
}

export interface ProgressSummary {
  assignmentsCompleted: number;
  assignmentStepsCompleted: number;
  focusSessionsCompleted: number;
  brainDumpEntriesProcessed: number;
  dailyCheckInsCompleted: number;
}

interface RecommendationBase {
  reason: string;
}

export type Recommendation =
  | (RecommendationBase & {
      type: "assignment_step";
      assignmentId: string;
      stepId: string;
      title: string;
      assignmentTitle: string;
      subject: { name: string; color: string; icon: string } | null;
      estimatedMinutes: number;
    })
  | (RecommendationBase & {
      type: "assignment";
      assignmentId: string;
      title: string;
      subject: { name: string; color: string; icon: string } | null;
      estimatedMinutes: number;
      needsBreakdown: boolean;
      allStepsDone: boolean;
    })
  | (RecommendationBase & {
      type: "brain_dump";
      brainDumpId: string;
      text: string;
      suggestedCategory: CategorySuggestion["category"];
    })
  | (RecommendationBase & {
      type: "organizational";
      action: "add_due_date" | "organize_brain_dump" | "pack_item";
      entityId: string;
      title: string;
    })
  | { type: "all_caught_up" };

export interface RecommendationResponse {
  recommendation: Recommendation;
  historyId: string;
}
