import type { MeSummary } from "../types";

export function XpBar({ me }: { me: MeSummary }) {
  const pct = me.xpForNextLevel ? Math.min(100, Math.round((me.xpIntoLevel / me.xpForNextLevel) * 100)) : 100;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold text-slate-700">
          Level {me.level} · {me.levelName}
        </span>
        <span className="text-slate-400">
          {me.xpForNextLevel ? `${me.xpIntoLevel} / ${me.xpForNextLevel} XP` : `${me.totalXp} XP`}
        </span>
      </div>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
