import { useMemo, useState } from "react";
import { Lock, Star } from "lucide-react";
import { PageContainer } from "../components/PageContainer";
import { XpBar } from "../components/XpBar";
import { AvatarView } from "../components/AvatarView";
import { IconSymbol } from "../components/IconSymbol";
import { useAchievements, useEquipReward, useMe, usePurchaseReward, useRewards, useUnequipReward } from "../api/hooks";
import type { RewardItem } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  hat: "Hats",
  outfit: "Outfits",
  accessory: "Accessories",
  background: "Backgrounds",
  theme: "Themes",
};

export default function Rewards() {
  const { data: me } = useMe();
  const { data: achievements } = useAchievements();
  const { data: rewards } = useRewards();
  const purchase = usePurchaseReward();
  const equip = useEquipReward();
  const unequip = useUnequipReward();
  const [tab, setTab] = useState<"achievements" | "store">("achievements");

  const equipped = useMemo(() => rewards?.items.filter((i) => i.owned && i.equipped) ?? [], [rewards]);

  const grouped = useMemo(() => {
    const map = new Map<string, RewardItem[]>();
    for (const item of rewards?.items ?? []) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [rewards]);

  if (!me) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-extrabold text-slate-800">Rewards</h1>

      <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row">
        <AvatarView equipped={equipped} size={100} />
        <div className="w-full flex-1">
          <XpBar me={me} />
          <div className="mt-3 flex items-center gap-1.5 text-sm font-bold text-amber-600">
            <Star size={16} fill="currentColor" /> {rewards?.stars ?? 0} stars to spend
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("achievements")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            tab === "achievements" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
          }`}
        >
          Achievements ({me.achievementCount})
        </button>
        <button
          onClick={() => setTab("store")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            tab === "store" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
          }`}
        >
          Reward Store
        </button>
      </div>

      {tab === "achievements" && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements?.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
                a.unlocked ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  a.unlocked ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                {a.unlocked ? <IconSymbol name={a.icon} size={22} /> : <Lock size={18} />}
              </div>
              <p className="text-sm font-bold text-slate-700">{a.title}</p>
              <p className="text-xs text-slate-500">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "store" && (
        <div className="mt-4 space-y-6">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-bold text-slate-600">{CATEGORY_LABELS[category] ?? category}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                    {item.owned ? (
                      <button
                        onClick={() => (item.equipped ? unequip.mutate(item.id) : equip.mutate(item.id))}
                        className={`w-full rounded-lg px-2 py-1.5 text-xs font-bold ${
                          item.equipped ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {item.equipped ? "Equipped" : "Equip"}
                      </button>
                    ) : (
                      <button
                        onClick={() => purchase.mutate(item.id)}
                        disabled={(rewards?.stars ?? 0) < item.cost}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-bold text-amber-700 disabled:opacity-40"
                      >
                        <Star size={12} fill="currentColor" /> {item.cost}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
