import { useState } from "react";
import { Sheet } from "./Sheet";
import { SubjectBadge } from "./SubjectBadge";
import { useCreateAssignment, useSubjects } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import type { Subject } from "../types";

function dateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DUE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "This Week", days: 4 },
  { label: "Next Week", days: 8 },
];

const DURATION_PRESETS = [5, 10, 15, 20, 30, 45];

export function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const { data: subjects } = useSubjects();
  const createAssignment = useCreateAssignment();
  const { celebrateXp } = useCelebration();

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const canSubmit = title.trim().length > 0 && !createAssignment.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    const result = await createAssignment.mutateAsync({
      title: title.trim(),
      subjectId: subjectId ?? undefined,
      dueDate: dueDate ?? undefined,
      estimatedMinutes: estimatedMinutes ?? undefined,
      notes: notes || undefined,
      priority,
    });
    celebrateXp(result.xp, "new_quest");
    onClose();
  };

  return (
    <Sheet title="Add a quest" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="quest-title" className="mb-1 block text-sm font-medium text-slate-600">
            What do you need to do?
          </label>
          <input
            id="quest-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Math worksheet"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-400"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">Subject (optional)</span>
          <div className="flex flex-wrap gap-2">
            {subjects?.map((s: Subject) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSubjectId(subjectId === s.id ? null : s.id)}
                className={`rounded-full transition ${subjectId === s.id ? "ring-2 ring-brand-500" : ""}`}
              >
                <SubjectBadge subject={s} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">When's it due? (optional)</span>
          <div className="flex flex-wrap gap-2">
            {DUE_PRESETS.map((preset) => {
              const value = dateInputValue(new Date(Date.now() + preset.days * 86400000));
              return (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => setDueDate(dueDate === value ? null : value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    dueDate === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <input
              type="date"
              value={dueDate && !DUE_PRESETS.some((p) => dateInputValue(new Date(Date.now() + p.days * 86400000)) === dueDate) ? dueDate : ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">About how long? (optional)</span>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((minutes) => (
              <button
                type="button"
                key={minutes}
                onClick={() => setEstimatedMinutes(estimatedMinutes === minutes ? null : minutes)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  estimatedMinutes === minutes ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {showMore ? "Hide extra details" : "Add notes or priority (optional)"}
        </button>

        {showMore && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any instructions or notes..."
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm capitalize transition ${
                    priority === p ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-brand-600 py-3 text-base font-bold text-white shadow transition hover:bg-brand-700 disabled:opacity-40"
        >
          Add quest
        </button>
      </form>
    </Sheet>
  );
}
