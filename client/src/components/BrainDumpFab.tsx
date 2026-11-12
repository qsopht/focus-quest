import { useState } from "react";
import { Brain, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAddBrainDump, useBrainDump } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";

// Mounted once in App.tsx (alongside Nav), so it's reachable from every page
// in one tap, and an unsaved draft survives navigating to another page —
// this component never unmounts on route change.
export function BrainDumpFab() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const addBrainDump = useAddBrainDump();
  const { data: entries } = useBrainDump();
  const { celebrateXp } = useCelebration();

  const unsortedCount = entries?.filter((e) => e.status === "unsorted").length ?? 0;

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    const result = await addBrainDump.mutateAsync(text);
    celebrateXp(result.xp, "brain_dump_capture");
    setDraft("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Brain Dump — get it out of your head"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-lg transition hover:bg-amber-300 sm:bottom-6 sm:right-6"
      >
        <Brain size={24} />
        {unsortedCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unsortedCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <button className="absolute inset-0 cursor-default bg-slate-900/30" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute bottom-36 right-4 w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-4 shadow-2xl sm:bottom-24 sm:right-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Get it out of your head</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              placeholder="What do you need to remember?"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-400"
            />
            <div className="mt-2 flex items-center justify-between">
              <Link to="/brain-dump" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-600 hover:underline">
                Organize entries{unsortedCount > 0 ? ` (${unsortedCount})` : ""}
              </Link>
              <button
                onClick={save}
                disabled={!draft.trim() || addBrainDump.isPending}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
