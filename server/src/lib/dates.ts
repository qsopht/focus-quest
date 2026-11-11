// Date helpers shared by routes. Everything here works in server-local time,
// which is fine for a single-timezone school deployment; a multi-timezone
// future would move "day key" computation to the client and pass it through.

export function dayKey(d: Date = new Date()): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// End of "this week" = end of the coming Sunday (or today if today is Sunday).
export function endOfThisWeek(d: Date = new Date()): Date {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return endOfDay(addDays(copy, daysUntilSunday));
}

// A bare "YYYY-MM-DD" string (what <input type="date"> sends) must be read as
// local midnight, not UTC midnight — otherwise it silently shifts a day
// earlier in any timezone behind UTC (new Date("2026-11-11") is UTC midnight,
// which is 2026-11-10 7pm in US Eastern). Full ISO datetime strings (with a
// time component) parse normally.
export function parseDateInput(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}

export function friendlyDue(due: Date | null, now: Date = new Date()): string {
  if (!due) return "No due date";
  const today = startOfDay(now);
  const target = startOfDay(due);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "Past due";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) {
    return `Coming up ${due.toLocaleDateString("en-US", { weekday: "long" })}`;
  }
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
