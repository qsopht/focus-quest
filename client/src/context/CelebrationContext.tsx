import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import type { XpAward } from "../types";
import { useAchievementLookup } from "../hooks/useAchievementLookup";

interface Toast {
  id: number;
  kind: "xp" | "achievement";
  text: string;
  sub?: string;
}

interface CelebrationContextValue {
  celebrateXp: (xp: XpAward | null | undefined, label?: string) => void;
  celebrateMessage: (text: string) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

// Varied phrasing pools keyed by context, so the same action doesn't show the
// exact same toast every time ("messages should vary to avoid becoming
// repetitive"). Any label not found here is shown verbatim — existing call
// sites that pass a plain custom string keep working unchanged.
const MESSAGE_POOLS: Record<string, string[]> = {
  quest_complete: ["Great job getting organized.", "Look at you making progress!", "One less thing to worry about.", "Nice! That's done."],
  step_complete: ["One small step is still progress.", "That's progress!", "Nice work chipping away at it.", "Small win — it counts."],
  new_quest: ["Nice! You got that out of your head and into your planner.", "Got it — one more thing you won't forget.", "Added. You're staying on top of it."],
  brain_dump_capture: ["Nice! You got that out of your head and into your planner.", "Got it out of your head — nice.", "Captured. You can let that go now."],
  brain_dump_processed: ["Great job getting organized.", "Sorted and handled.", "That's one less loose end."],
  steps_broken_down: ["You broke that big assignment into smaller steps. That's progress!", "Smaller steps, same goal. Nice work.", "That's a lot less scary now."],
  focus_start: ["You showed up and got started. That's a win.", "Here we go — one step at a time."],
  focus_complete: ["You showed up and got started. That's a win.", "Look at you making progress!", "That session counted."],
  focus_effort: ["Some progress beats no progress.", "You tried — that matters.", "Every bit of effort counts."],
  routine_item: ["Nice and ready for what's next.", "That's one more thing handled."],
  organizing: ["Great job getting organized.", "Nice and tidy — good work."],
};

function pickMessage(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const pool = MESSAGE_POOLS[key];
  if (!pool) return key;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const lookupAchievement = useAchievementLookup();

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const celebrateXp = useCallback(
    (xp: XpAward | null | undefined, label?: string) => {
      if (!xp) return;
      push({ kind: "xp", text: `+${xp.amount} XP`, sub: pickMessage(label) });
      for (const key of xp.unlocked) {
        const achievement = lookupAchievement(key);
        push({
          kind: "achievement",
          text: "Achievement unlocked!",
          sub: achievement?.title ?? key,
        });
      }
    },
    [push, lookupAchievement]
  );

  const celebrateMessage = useCallback((text: string) => push({ kind: "xp", text }), [push]);

  return (
    <CelebrationContext.Provider value={{ celebrateXp, celebrateMessage }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-pop-in pointer-events-auto rounded-2xl px-5 py-3 text-center shadow-lg ${
              toast.kind === "achievement" ? "bg-amber-400 text-amber-950" : "bg-brand-600 text-white"
            }`}
          >
            <div className="font-bold">{toast.text}</div>
            {toast.sub && <div className="text-sm opacity-90">{toast.sub}</div>}
          </div>
        ))}
      </div>
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}
