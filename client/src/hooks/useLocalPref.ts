import { useState } from "react";

// Lightweight client-side preference storage for reminder toggles. These are
// per-device UI preferences, not account data, so localStorage is sufficient
// for the MVP; a future server-backed Preferences model could replace this
// without changing the call sites (same hook signature).
export function useLocalPref(key: string, defaultValue: boolean) {
  const storageKey = `fq_pref_${key}`;
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === null ? defaultValue : stored === "true";
  });

  const update = (next: boolean) => {
    setValue(next);
    localStorage.setItem(storageKey, String(next));
  };

  return [value, update] as const;
}
