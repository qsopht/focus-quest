import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "../components/PageContainer";
import { QuestCard } from "../components/QuestCard";
import { SubjectBadge } from "../components/SubjectBadge";
import { QuickAddSheet } from "../components/QuickAddSheet";
import { QuestDetailSheet } from "../components/QuestDetailSheet";
import { useAssignments, useCompleteAssignment, useSubjects } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";

const TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Done" },
];

export default function MyQuests() {
  const [tab, setTab] = useState("today");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const { data: subjects } = useSubjects();
  const { data: overdue } = useAssignments("overdue");
  const { data: bucketAssignments } = useAssignments(tab);
  const completeAssignment = useCompleteAssignment();
  const { celebrateXp } = useCelebration();

  const list = useMemo(() => {
    const combined = tab === "today" ? [...(overdue ?? []), ...(bucketAssignments ?? [])] : bucketAssignments ?? [];
    const deduped = Array.from(new Map(combined.map((a) => [a.id, a])).values());
    return subjectFilter ? deduped.filter((a) => a.subjectId === subjectFilter) : deduped;
  }, [tab, overdue, bucketAssignments, subjectFilter]);

  const openAssignment = list.find((a) => a.id === openAssignmentId) ?? null;

  const handleComplete = async (id: string) => {
    const result = await completeAssignment.mutateAsync(id);
    if (result.xp) celebrateXp(result.xp, "quest_complete");
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">My Quests</h1>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subjects && subjects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setSubjectFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              !subjectFilter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            All subjects
          </button>
          {subjects.map((s) => (
            <button key={s.id} onClick={() => setSubjectFilter(s.id === subjectFilter ? null : s.id)} className="rounded-full">
              <span className={subjectFilter === s.id ? "ring-2 ring-brand-500 rounded-full" : ""}>
                <SubjectBadge subject={s} size="sm" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
            {tab === "completed" ? "Nothing finished yet — that's okay!" : "No quests here yet."}
          </p>
        )}
        {list.map((a) => (
          <QuestCard
            key={a.id}
            assignment={a}
            overdue={overdue?.some((o) => o.id === a.id)}
            onComplete={() => handleComplete(a.id)}
            onOpen={() => setOpenAssignmentId(a.id)}
          />
        ))}
      </div>

      {showQuickAdd && <QuickAddSheet onClose={() => setShowQuickAdd(false)} />}
      {openAssignment && <QuestDetailSheet assignment={openAssignment} onClose={() => setOpenAssignmentId(null)} />}
    </PageContainer>
  );
}
