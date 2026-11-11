import { useMemo, useState } from "react";
import { ArrowRight, Plus, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/PageContainer";
import { XpBar } from "../components/XpBar";
import { AvatarView } from "../components/AvatarView";
import { ProgressRing } from "../components/ProgressRing";
import { QuestCard } from "../components/QuestCard";
import { QuickAddSheet } from "../components/QuickAddSheet";
import { QuestDetailSheet } from "../components/QuestDetailSheet";
import { useAssignments, useCompleteAssignment, useMe, useRewards } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";

const ENCOURAGEMENTS = [
  "You've got this.",
  "Just start with five minutes.",
  "One small step is still progress.",
  "You don't have to do everything at once.",
  "Progress, not perfection.",
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { data: me } = useMe();
  const { data: today } = useAssignments("today");
  const { data: overdue } = useAssignments("overdue");
  const { data: rewards } = useRewards();
  const completeAssignment = useCompleteAssignment();
  const { celebrateXp } = useCelebration();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const todaysList = useMemo(() => [...(overdue ?? []), ...(today ?? [])], [today, overdue]);
  const openAssignment = todaysList.find((a) => a.id === openAssignmentId) ?? null;
  const completedToday = todaysList.filter((a) => a.status === "completed").length;
  const nextUp = todaysList.find((a) => a.status === "active");
  const equipped = useMemo(() => rewards?.items.filter((i) => i.owned && i.equipped) ?? [], [rewards]);
  const encouragement = useMemo(() => ENCOURAGEMENTS[new Date().getDate() % ENCOURAGEMENTS.length], []);

  const handleComplete = async (id: string) => {
    const result = await completeAssignment.mutateAsync(id);
    if (result.xp) celebrateXp(result.xp, "Quest complete!");
  };

  if (!me) return null;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {greeting()}, {me.name}!
          </h1>
          <p className="mt-1 text-slate-500">{encouragement}</p>
        </div>
        <Link to="/rewards" className="self-start">
          <AvatarView equipped={equipped} size={76} />
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <XpBar me={me} />
        {me.streak.activeDaysLast7 >= 2 && (
          <p className="mt-2 text-xs font-medium text-emerald-600">
            🔥 Active {me.streak.activeDaysLast7} of the last 7 days
          </p>
        )}
      </div>

      {nextUp && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-md">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-100">Next up</p>
          <h2 className="mt-1 text-xl font-bold">{nextUp.title}</h2>
          <p className="mt-1 text-sm text-brand-100">{nextUp.friendlyDue}</p>
          <button
            onClick={() => setOpenAssignmentId(nextUp.id)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
          >
            Get started <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">Today's quests</h2>
        <ProgressRing progress={todaysList.length ? completedToday / todaysList.length : 0} size={52} stroke={6}>
          <span className="text-xs font-bold text-slate-600">
            {completedToday}/{todaysList.length}
          </span>
        </ProgressRing>
      </div>

      <div className="mt-3 space-y-2">
        {todaysList.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            Nothing due today. Nice and clear!
          </p>
        )}
        {todaysList
          .filter((a) => a.status === "active")
          .map((a) => (
            <QuestCard
              key={a.id}
              assignment={a}
              overdue={overdue?.some((o) => o.id === a.id)}
              onComplete={() => handleComplete(a.id)}
              onOpen={() => setOpenAssignmentId(a.id)}
            />
          ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 font-bold text-white shadow hover:bg-brand-700"
        >
          <Plus size={18} /> Add a quest
        </button>
        <Link
          to="/focus"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-200 py-4 font-bold text-brand-700 hover:bg-brand-50"
        >
          <Timer size={18} /> Start focusing
        </Link>
      </div>

      {showQuickAdd && <QuickAddSheet onClose={() => setShowQuickAdd(false)} />}
      {openAssignment && <QuestDetailSheet assignment={openAssignment} onClose={() => setOpenAssignmentId(null)} />}
    </PageContainer>
  );
}
