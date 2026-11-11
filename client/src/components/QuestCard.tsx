import { Check, Clock } from "lucide-react";
import type { Assignment } from "../types";
import { SubjectBadge } from "./SubjectBadge";
import { dateInputValue } from "../lib/dates";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

export function QuestCard({
  assignment,
  onComplete,
  onOpen,
  overdue = false,
  onReschedule,
}: {
  assignment: Assignment;
  onComplete: () => void;
  onOpen: () => void;
  overdue?: boolean;
  onReschedule?: (dueDate: string) => void;
}) {
  const doneSteps = assignment.steps.filter((s) => s.completed).length;
  const totalSteps = assignment.steps.length;

  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        overdue ? "border-amber-200" : "border-slate-100"
      }`}
    >
      <button
        aria-label={`Mark "${assignment.title}" complete`}
        onClick={onComplete}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition hover:border-brand-500 hover:text-brand-500 focus-visible:border-brand-500 focus-visible:text-brand-500"
      >
        <Check size={16} strokeWidth={3} />
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[assignment.priority]}`} aria-hidden="true" />
          <h3 className="truncate font-semibold text-slate-800">{assignment.title}</h3>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <SubjectBadge subject={assignment.subject} size="sm" />
          <span className={overdue ? "font-medium text-amber-600" : ""}>{assignment.friendlyDue}</span>
          {assignment.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {assignment.estimatedMinutes} min
            </span>
          )}
          {totalSteps > 0 && (
            <span>
              {doneSteps}/{totalSteps} steps
            </span>
          )}
        </div>
      </button>

      {onReschedule && (
        <input
          type="date"
          aria-label="Reschedule"
          value={assignment.dueDate ? dateInputValue(new Date(assignment.dueDate)) : ""}
          onChange={(e) => e.target.value && onReschedule(e.target.value)}
          className="mt-0.5 w-[6.5rem] shrink-0 rounded-lg border border-transparent bg-transparent p-1.5 text-xs text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-brand-600 focus:border-slate-200"
        />
      )}
    </div>
  );
}
