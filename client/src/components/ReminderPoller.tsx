import { useEffect, useRef } from "react";
import { useDismissReminder, useReminders } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";

// Polls due reminders and surfaces each one exactly once: an in-app toast
// always, plus a browser notification if the student has granted permission.
// Each reminder is dismissed server-side right after it fires so students are
// never nagged twice about the same thing.
export function ReminderPoller() {
  const { data: reminders } = useReminders();
  const dismiss = useDismissReminder();
  const { celebrateMessage } = useCelebration();
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (!reminders) return;
    const now = Date.now();

    for (const reminder of reminders) {
      if (shown.current.has(reminder.id)) continue;
      if (new Date(reminder.remindAt).getTime() > now) continue;

      shown.current.add(reminder.id);
      celebrateMessage(reminder.message);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Focus Quest", { body: reminder.message, tag: reminder.id });
      }

      dismiss.mutate(reminder.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  return null;
}
