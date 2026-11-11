import { useAchievements } from "../api/hooks";

export function useAchievementLookup() {
  const { data } = useAchievements();
  return (key: string) => data?.find((a) => a.key === key);
}
