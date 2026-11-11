import { useState } from "react";
import { Sheet } from "./Sheet";
import { useCreateCalendarEvent } from "../api/hooks";
import { dateInputValue } from "../lib/dates";

const TYPES = [
  { key: "test", label: "Test" },
  { key: "quiz", label: "Quiz" },
  { key: "project", label: "Project" },
  { key: "event", label: "Event" },
];

export function AddEventSheet({ onClose }: { onClose: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [type, setType] = useState("event");

  const submit = async () => {
    if (!title.trim()) return;
    await createEvent.mutateAsync({ title: title.trim(), date, type });
    onClose();
  };

  return (
    <Sheet title="Add to calendar" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">What is it?</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Science Unit Test"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">Type</span>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                  type === t.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700">
          Add to calendar
        </button>
      </form>
    </Sheet>
  );
}
