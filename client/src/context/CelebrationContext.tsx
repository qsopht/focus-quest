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
      push({ kind: "xp", text: `+${xp.amount} XP`, sub: label });
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
