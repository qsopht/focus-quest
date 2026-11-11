import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { PageContainer } from "../components/PageContainer";
import { SettingsSection } from "../components/SettingsSection";
import { Toggle } from "../components/Toggle";
import {
  useAddChecklistItem,
  useAddRoutineItem,
  useBrainDump,
  useAddBrainDump,
  useConvertBrainDump,
  useDeleteBrainDump,
  useChecklist,
  useCompleteRoutineItem,
  useDeleteChecklistItem,
  useDeleteRoutineItem,
  useResetChecklist,
  useRoutines,
  useToggleChecklistItem,
} from "../api/hooks";
import { useLocalPref } from "../hooks/useLocalPref";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import { useAuth } from "../context/AuthContext";
import { useCelebration } from "../context/CelebrationContext";

const ROUTINE_LABELS: Record<string, string> = {
  morning: "Morning Launch",
  afterschool: "After School Reset",
  evening: "Evening Wind-down",
};

export default function Settings() {
  const { logout } = useAuth();
  const { data: routines } = useRoutines();
  const completeRoutineItem = useCompleteRoutineItem();
  const addRoutineItem = useAddRoutineItem();
  const deleteRoutineItem = useDeleteRoutineItem();

  const { data: checklist } = useChecklist();
  const toggleChecklistItem = useToggleChecklistItem();
  const addChecklistItem = useAddChecklistItem();
  const deleteChecklistItem = useDeleteChecklistItem();
  const resetChecklist = useResetChecklist();

  const { data: brainDump } = useBrainDump();
  const addBrainDump = useAddBrainDump();
  const convertBrainDump = useConvertBrainDump();
  const deleteBrainDump = useDeleteBrainDump();
  const { celebrateXp } = useCelebration();

  const { supported, permission, request } = useNotificationPermission();
  const [dueReminders, setDueReminders] = useLocalPref("due_reminders", true);
  const [morningOverview, setMorningOverview] = useLocalPref("morning_overview", true);
  const [afterSchoolCheckin, setAfterSchoolCheckin] = useLocalPref("afterschool_checkin", false);

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newBrainDump, setNewBrainDump] = useState("");
  const [newRoutineItems, setNewRoutineItems] = useState<Record<string, string>>({});

  return (
    <PageContainer>
      <h1 className="text-2xl font-extrabold text-slate-800">Settings</h1>

      <SettingsSection title="Notifications">
        {supported ? (
          permission === "granted" ? (
            <p className="mb-2 text-sm text-emerald-600">Browser notifications are on.</p>
          ) : (
            <button
              onClick={request}
              className="mb-3 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Turn on browser notifications
            </button>
          )
        ) : (
          <p className="mb-2 text-sm text-slate-400">Your browser doesn't support notifications.</p>
        )}
        <Toggle checked={dueReminders} onChange={setDueReminders} label="Remind me about due dates" />
        <Toggle checked={morningOverview} onChange={setMorningOverview} label="Daily morning overview" />
        <Toggle checked={afterSchoolCheckin} onChange={setAfterSchoolCheckin} label="After-school check-in" />
      </SettingsSection>

      <SettingsSection title="Daily routines">
        <div className="space-y-5">
          {routines?.map((routine) => (
            <div key={routine.id}>
              <h3 className="mb-2 text-sm font-bold text-slate-600">{ROUTINE_LABELS[routine.type] ?? routine.name}</h3>
              <div className="space-y-1.5">
                {routine.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <button
                      onClick={async () => {
                        const result = await completeRoutineItem.mutateAsync(item.id);
                        if (result.xp) celebrateXp(result.xp, "Routine checked off");
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        item.completedToday ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <span className={`flex-1 text-sm ${item.completedToday ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {item.title}
                    </span>
                    <button onClick={() => deleteRoutineItem.mutate(item.id)} className="text-slate-300 hover:text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <form
                className="mt-1.5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = newRoutineItems[routine.id]?.trim();
                  if (!title) return;
                  addRoutineItem.mutate({ routineId: routine.id, title });
                  setNewRoutineItems((prev) => ({ ...prev, [routine.id]: "" }));
                }}
              >
                <input
                  value={newRoutineItems[routine.id] ?? ""}
                  onChange={(e) => setNewRoutineItems((prev) => ({ ...prev, [routine.id]: e.target.value }))}
                  placeholder="Add a step"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
                <button type="submit" className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200">
                  <Plus size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Backpack checklist">
        <div className="space-y-1.5">
          {checklist?.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <button
                onClick={() => toggleChecklistItem.mutate(item.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  item.checked ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 text-transparent"
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </button>
              <span className={`flex-1 text-sm ${item.checked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {item.label}
              </span>
              <button onClick={() => deleteChecklistItem.mutate(item.id)} className="text-slate-300 hover:text-rose-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newChecklistItem.trim()) return;
              addChecklistItem.mutate(newChecklistItem.trim());
              setNewChecklistItem("");
            }}
          >
            <input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder="Add something to pack"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200">
              <Plus size={14} />
            </button>
          </form>
          <button
            onClick={() => resetChecklist.mutate()}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200"
          >
            Reset for tomorrow
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Brain dump">
        <p className="mb-2 text-sm text-slate-500">Quickly jot down anything you don't want to forget.</p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newBrainDump.trim()) return;
            const result = await addBrainDump.mutateAsync(newBrainDump.trim());
            celebrateXp(result.xp);
            setNewBrainDump("");
          }}
        >
          <input
            value={newBrainDump}
            onChange={(e) => setNewBrainDump(e.target.value)}
            placeholder="e.g. Ask about extra credit"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700">
            Save
          </button>
        </form>
        <div className="mt-3 space-y-1.5">
          {brainDump?.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="flex-1 text-slate-700">{entry.text}</span>
              {!entry.convertedToAssignmentId && (
                <button
                  onClick={() => convertBrainDump.mutate(entry.id)}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Make it a quest
                </button>
              )}
              <button onClick={() => deleteBrainDump.mutate(entry.id)} className="text-slate-300 hover:text-rose-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Profile">
        <button onClick={logout} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
          Switch profile
        </button>
      </SettingsSection>
    </PageContainer>
  );
}
