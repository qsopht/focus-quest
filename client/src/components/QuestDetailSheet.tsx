import { useState } from "react";
import { Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { Sheet } from "./Sheet";
import { SubjectBadge } from "./SubjectBadge";
import {
  useAddSteps,
  useCompleteAssignment,
  useCompleteStep,
  useDeleteAssignment,
  useDeleteStep,
  useReopenAssignment,
  useSuggestSteps,
} from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import type { Assignment } from "../types";

export function QuestDetailSheet({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const completeAssignment = useCompleteAssignment();
  const reopenAssignment = useReopenAssignment();
  const deleteAssignment = useDeleteAssignment();
  const completeStep = useCompleteStep();
  const deleteStep = useDeleteStep();
  const addSteps = useAddSteps();
  const suggestSteps = useSuggestSteps();
  const { celebrateXp } = useCelebration();

  const [newStep, setNewStep] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  const doneSteps = assignment.steps.filter((s) => s.completed).length;

  return (
    <Sheet title="Quest details" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <SubjectBadge subject={assignment.subject} />
            <span className="text-sm text-slate-500">{assignment.friendlyDue}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-800">{assignment.title}</h2>
          {assignment.notes && <p className="mt-1 text-sm text-slate-500">{assignment.notes}</p>}
          {assignment.estimatedMinutes && (
            <p className="mt-1 text-sm text-slate-400">About {assignment.estimatedMinutes} minutes</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-600">
              Steps {assignment.steps.length > 0 && `(${doneSteps}/${assignment.steps.length})`}
            </h3>
            {assignment.steps.length === 0 && (
              <button
                onClick={async () => {
                  const result = await suggestSteps.mutateAsync(assignment.id);
                  setSuggestions(result.steps);
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              >
                <Sparkles size={14} /> Suggest steps
              </button>
            )}
          </div>

          {suggestions && (
            <div className="mb-3 rounded-xl bg-brand-50 p-3">
              <p className="mb-2 text-xs font-medium text-brand-700">Here's one way to break it down:</p>
              <ul className="mb-2 list-inside list-disc text-sm text-slate-700">
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await addSteps.mutateAsync({ assignmentId: assignment.id, titles: suggestions });
                    setSuggestions(null);
                  }}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Use these steps
                </button>
                <button onClick={() => setSuggestions(null)} className="text-sm text-slate-500">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {assignment.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-2.5">
                <button
                  onClick={async () => {
                    const result = await completeStep.mutateAsync({ assignmentId: assignment.id, stepId: step.id });
                    if (result.xp) celebrateXp(result.xp, "Step complete");
                  }}
                  aria-label={step.completed ? "Mark step incomplete" : "Mark step complete"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    step.completed ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 text-transparent"
                  }`}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <span className={`flex-1 text-sm ${step.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {step.title}
                </span>
                <button
                  onClick={() => deleteStep.mutate({ assignmentId: assignment.id, stepId: step.id })}
                  aria-label="Delete step"
                  className="text-slate-300 hover:text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>

          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newStep.trim()) return;
              await addSteps.mutateAsync({ assignmentId: assignment.id, titles: [newStep.trim()] });
              setNewStep("");
            }}
          >
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Add a step"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Add step">
              <Plus size={16} />
            </button>
          </form>
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-4">
          {assignment.status === "active" ? (
            <button
              onClick={async () => {
                const result = await completeAssignment.mutateAsync(assignment.id);
                if (result.xp) celebrateXp(result.xp, "Quest complete!");
                onClose();
              }}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700"
            >
              Mark complete
            </button>
          ) : (
            <button
              onClick={() => {
                reopenAssignment.mutate(assignment.id);
                onClose();
              }}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 font-semibold text-slate-600 hover:bg-slate-200"
            >
              Reopen quest
            </button>
          )}
          <button
            onClick={() => {
              deleteAssignment.mutate(assignment.id);
              onClose();
            }}
            className="rounded-xl bg-rose-50 px-4 py-2.5 font-semibold text-rose-600 hover:bg-rose-100"
          >
            Delete
          </button>
        </div>
      </div>
    </Sheet>
  );
}
