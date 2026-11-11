import { IconSymbol } from "./IconSymbol";
import type { Subject } from "../types";

export function SubjectBadge({ subject, size = "md" }: { subject: Subject | null; size?: "sm" | "md" }) {
  if (!subject) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        No subject
      </span>
    );
  }

  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: `${subject.color}1a`, color: subject.color }}
    >
      <IconSymbol name={subject.icon} size={14} />
      {subject.name}
    </span>
  );
}
