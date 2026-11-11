import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "../components/PageContainer";
import { QuestCard } from "../components/QuestCard";
import { QuestDetailSheet } from "../components/QuestDetailSheet";
import { AddEventSheet } from "../components/AddEventSheet";
import { IconSymbol } from "../components/IconSymbol";
import {
  useAssignments,
  useCalendarEvents,
  useCompleteAssignment,
  useDeleteCalendarEvent,
  useUpdateAssignment,
} from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import { endOfDay, endOfThisWeek, friendlyDayLabel, isSameDay, monthMatrix } from "../lib/dates";
import type { Assignment, CalendarEvent } from "../types";

const TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "upcoming", label: "Upcoming" },
];

const EVENT_ICON: Record<string, string> = { test: "flag", quiz: "list-checks", project: "layers", event: "star" };

function inRange(date: Date, tab: string, now: Date) {
  if (tab === "today") return isSameDay(date, now);
  if (tab === "week") return date > endOfDay(now) && date <= endOfThisWeek(now);
  return date > endOfThisWeek(now);
}

export default function CalendarPage() {
  const [tab, setTab] = useState("today");
  const [monthView, setMonthView] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const { data: overdue } = useAssignments("overdue");
  const { data: active } = useAssignments("active");
  const { data: events } = useCalendarEvents();
  const completeAssignment = useCompleteAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteEvent = useDeleteCalendarEvent();
  const { celebrateXp } = useCelebration();

  const now = new Date();

  const groups = useMemo(() => {
    const items: { date: Date; assignment?: Assignment; event?: CalendarEvent }[] = [];

    for (const a of active ?? []) {
      if (!a.dueDate) continue;
      const d = new Date(a.dueDate);
      if (inRange(d, tab, now)) items.push({ date: d, assignment: a });
    }
    for (const e of events ?? []) {
      const d = new Date(e.date);
      if (inRange(d, tab, now)) items.push({ date: d, event: e });
    }
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    const byDay = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.date.toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(item);
    }
    return Array.from(byDay.entries());
  }, [active, events, tab]);

  const handleComplete = async (id: string) => {
    const result = await completeAssignment.mutateAsync(id);
    if (result.xp) celebrateXp(result.xp, "Quest complete!");
  };

  const openAssignment =
    (overdue ?? []).find((a) => a.id === openAssignmentId) ?? (active ?? []).find((a) => a.id === openAssignmentId) ?? null;

  const monthDays = useMemo(
    () => monthMatrix(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor]
  );
  const itemDatesInMonth = useMemo(() => {
    const set = new Set<string>();
    for (const a of active ?? []) if (a.dueDate) set.add(new Date(a.dueDate).toDateString());
    for (const e of events ?? []) set.add(new Date(e.date).toDateString());
    return set;
  }, [active, events]);

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">Calendar</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMonthView((v) => !v)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {monthView ? "List view" : "Month view"}
          </button>
          <button
            onClick={() => setShowAddEvent(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Event
          </button>
        </div>
      </div>

      {overdue && overdue.length > 0 && !monthView && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-700">Catch up — no stress, just whenever you're ready</p>
          <div className="space-y-2">
            {overdue.map((a) => (
              <QuestCard key={a.id} assignment={a} overdue onComplete={() => handleComplete(a.id)} onOpen={() => setOpenAssignmentId(a.id)} onReschedule={(d) => updateAssignment.mutate({ id: a.id, dueDate: d })} />
            ))}
          </div>
        </div>
      )}

      {monthView ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="px-2 text-slate-500">
              ‹
            </button>
            <h2 className="font-bold text-slate-700">
              {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="px-2 text-slate-500">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthDays.flat().map((d, i) => (
              <div
                key={i}
                className={`flex h-12 flex-col items-center justify-center rounded-lg text-sm ${
                  d && isSameDay(d, now) ? "bg-brand-100 font-bold text-brand-700" : "text-slate-600"
                }`}
              >
                {d && d.getDate()}
                {d && itemDatesInMonth.has(d.toDateString()) && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
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

          <div className="mt-4 space-y-5">
            {groups.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                Nothing here yet.
              </p>
            )}
            {groups.map(([dayKey, items]) => (
              <div key={dayKey}>
                <h3 className="mb-2 text-sm font-bold text-slate-500">{friendlyDayLabel(items[0].date, now)}</h3>
                <div className="space-y-2">
                  {items.map((item, i) =>
                    item.assignment ? (
                      <QuestCard
                        key={item.assignment.id}
                        assignment={item.assignment}
                        onComplete={() => handleComplete(item.assignment!.id)}
                        onOpen={() => setOpenAssignmentId(item.assignment!.id)}
                        onReschedule={(d) => updateAssignment.mutate({ id: item.assignment!.id, dueDate: d })}
                      />
                    ) : (
                      <div key={item.event!.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <IconSymbol name={EVENT_ICON[item.event!.type]} size={16} />
                        </div>
                        <span className="flex-1 font-semibold text-slate-700">{item.event!.title}</span>
                        <button
                          onClick={() => deleteEvent.mutate(item.event!.id)}
                          className="text-xs font-medium text-slate-400 hover:text-rose-500"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddEvent && <AddEventSheet onClose={() => setShowAddEvent(false)} />}
      {openAssignment && <QuestDetailSheet assignment={openAssignment} onClose={() => setOpenAssignmentId(null)} />}
    </PageContainer>
  );
}
