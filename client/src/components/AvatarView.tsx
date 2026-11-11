import type { RewardItem } from "../types";

// A simple, friendly layered avatar built from CSS + emoji rather than custom
// art assets — keeps the MVP dependency-free while still feeling
// personalizable. Swapping in illustrated art later only means changing the
// lookup tables below; equip/purchase logic doesn't change.

const BACKGROUNDS: Record<string, string> = {
  forest: "linear-gradient(160deg, #bbf7d0, #4ade80)",
  space: "linear-gradient(160deg, #312e81, #1e1b4b)",
  beach: "linear-gradient(160deg, #bae6fd, #38bdf8)",
  sunset: "linear-gradient(160deg, #fed7aa, #fb7185)",
};
const DEFAULT_BACKGROUND = "linear-gradient(160deg, #e0e7ff, #c7d2fe)";

const OUTFIT_EMOJI: Record<string, string> = { hoodie: "👕", vest: "🦺" };
const HAT_EMOJI: Record<string, string> = { cap: "🧢", beanie: "🧣", crown: "👑" };
const ACCESSORY_EMOJI: Record<string, string> = { glasses: "🕶️", scarf: "🧣" };

export function AvatarView({ equipped, size = 120 }: { equipped: RewardItem[]; size?: number }) {
  const byCategory = Object.fromEntries(equipped.map((i) => [i.category, i]));
  const background =
    BACKGROUNDS[byCategory.theme?.assetRef ?? ""] ?? BACKGROUNDS[byCategory.background?.assetRef ?? ""] ?? DEFAULT_BACKGROUND;
  const outfitEmoji = OUTFIT_EMOJI[byCategory.outfit?.assetRef ?? ""];
  const hatEmoji = HAT_EMOJI[byCategory.hat?.assetRef ?? ""];
  const accessoryEmoji = ACCESSORY_EMOJI[byCategory.accessory?.assetRef ?? ""];

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-3xl shadow-inner"
      style={{ width: size, height: size, background }}
    >
      <div className="relative flex flex-col items-center">
        <div className="text-5xl leading-none">🙂</div>
        {outfitEmoji && <div className="-mt-1 text-2xl">{outfitEmoji}</div>}
      </div>
      {hatEmoji && <div className="absolute top-1 text-2xl">{hatEmoji}</div>}
      {accessoryEmoji && <div className="absolute bottom-3 right-3 text-xl">{accessoryEmoji}</div>}
    </div>
  );
}
