import { useState } from "react";
import { Lightbulb, Trash2 } from "lucide-react";
import { PageContainer } from "../components/PageContainer";
import { QuestDetailSheet } from "../components/QuestDetailSheet";
import {
  useAddBrainDump,
  useAssignments,
  useBrainDump,
  useConvertBrainDumpToAssignment,
  useConvertBrainDumpToChecklist,
  useConvertBrainDumpToEvent,
  useConvertBrainDumpToReminder,
  useDeleteBrainDump,
  useKeepBrainDumpAsNote,
} from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import { api } from "../api/client";
import type { BrainDumpEntry, CategorySuggestion } from "../types";

const CONVERTED_LABEL: Record<string, string> = {
  assignment: "Became a quest",
  reminder: "Became a reminder",
  calendar_event: "Added to calendar",
  checklist_item: "Added to backpack checklist",
  note: "Kept as a note",
};

export default function BrainDump() {
  const { data: entries } = useBrainDump();
  const addBrainDump = useAddBrainDump();
  const convertToAssignment = useConvertBrainDumpToAssignment();
  const convertToReminder = useConvertBrainDumpToReminder();
  const convertToEvent = useConvertBrainDumpToEvent();
  const convertToChecklist = useConvertBrainDumpToChecklist();
  const keepAsNote = useKeepBrainDumpAsNote();
  const deleteEntry = useDeleteBrainDump();
  const { celebrateXp } = useCelebration();
  const { data: activeAssignments } = useAssignments("active");

  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, CategorySuggestion>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const unsorted = entries?.filter((e) => e.status === "unsorted") ?? [];
  const processed = entries?.filter((e) => e.status === "processed") ?? [];
  const openAssignment = activeAssignments?.find((a) => a.id === openAssignmentId) ?? null;

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    const result = await addBrainDump.mutateAsync(text);
    celebrateXp(result.xp, "brain_dump_capture");
    setDraft("");
  };

  const helpMeOrganize = async () => {
    setLoadingSuggestions(true);
    try {
      const results = await Promise.all(
        unsorted.map((e) => api.get<CategorySuggestion>(`/braindump/${e.id}/suggest-category`).then((s) => [e.id, s] as const))
      );
      setSuggestions(Object.fromEntries(results));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const celebrateProcessed = (xp: Parameters<typeof celebrateXp>[0]) => celebrateXp(xp, "brain_dump_processed");

  return (
    <PageContainer>
      <h1 className="text-2xl font-extrabold text-slate-800">Brain Dump</h1>
      <p className="mt-1 text-slate-500">Get it out of your head. Decide what to do with it later.</p>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What do you need to remember?"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-400"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={save}
            disabled={!draft.trim() || addBrainDump.isPending}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">Unsorted {unsorted.length > 0 && `(${unsorted.length})`}</h2>
        {unsorted.length > 0 && (
          <button
            onClick={helpMeOrganize}
            disabled={loadingSuggestions}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            <Lightbulb size={14} /> Help me organize these
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {unsorted.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            Nothing unsorted — nice and clear!
          </p>
        )}
        {unsorted.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
            <p className="font-medium text-slate-800">{entry.text}</p>
            {suggestions[entry.id] && (
              <p className="mt-1 text-xs font-medium text-amber-700">{suggestions[entry.id].label}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const result = await convertToAssignment.mutateAsync({ id: entry.id });
                  celebrateProcessed(result.xp);
                  setOpenAssignmentId(result.assignment.id);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                Turn into Assignment
              </button>
              <button
                onClick={async () => {
                  const result = await convertToReminder.mutateAsync(entry.id);
                  celebrateProcessed(result.xp);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                Turn into Reminder
              </button>
              <button
                onClick={async () => {
                  const result = await convertToEvent.mutateAsync(entry.id);
                  celebrateProcessed(result.xp);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                Add to Calendar
              </button>
              <button
                onClick={async () => {
                  const result = await convertToChecklist.mutateAsync(entry.id);
                  celebrateProcessed(result.xp);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                Add to Backpack
              </button>
              <button
                onClick={async () => {
                  const result = await keepAsNote.mutateAsync(entry.id);
                  celebrateProcessed(result.xp);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                Keep as Note
              </button>
              <button
                onClick={() => deleteEntry.mutate(entry.id)}
                aria-label="Delete"
                className="ml-auto rounded-full p-1.5 text-slate-300 hover:text-rose-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {processed.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Processed</h2>
          <div className="space-y-2">
            {processed.map((entry: BrainDumpEntry) => (
              <div key={entry.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <span className="flex-1 text-slate-500 line-through decoration-slate-300">{entry.text}</span>
                <span className="text-xs font-medium text-slate-400">
                  {CONVERTED_LABEL[entry.convertedItemType ?? ""] ?? "Processed"}
                </span>
                <button onClick={() => deleteEntry.mutate(entry.id)} className="text-slate-300 hover:text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {openAssignment && <QuestDetailSheet assignment={openAssignment} onClose={() => setOpenAssignmentId(null)} />}
    </PageContainer>
  );
}
