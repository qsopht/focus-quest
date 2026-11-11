// Static catalogs seeded once. Keys here must match the predicate keys in
// lib/xp.ts's ACHIEVEMENT_PREDICATES.

export const ACHIEVEMENTS = [
  { key: "first_quest", title: "First Quest", description: "Complete your first assignment.", icon: "flag" },
  { key: "getting_organized", title: "Getting Organized", description: "Add five assignments.", icon: "list-checks" },
  { key: "focus_master", title: "Focus Master", description: "Complete five focus sessions.", icon: "timer" },
  { key: "breaking_it_down", title: "Breaking It Down", description: "Complete a multi-step assignment.", icon: "layers" },
  { key: "big_finish", title: "Big Finish", description: "Finish a major project, step by step.", icon: "trophy" },
  { key: "ready_for_tomorrow", title: "Ready for Tomorrow", description: "Complete your evening routine.", icon: "moon" },
  { key: "steady_week", title: "Steady Week", description: "Stay active 5 of the last 7 days.", icon: "calendar-check" },
  { key: "brain_unloaded", title: "Brain Unloaded", description: "Capture three thoughts in your Brain Dump.", icon: "brain" },
];

export const REWARD_ITEMS = [
  { key: "hat_cap", name: "Classic Cap", category: "hat", cost: 20, assetRef: "cap" },
  { key: "hat_beanie", name: "Cozy Beanie", category: "hat", cost: 30, assetRef: "beanie" },
  { key: "hat_crown", name: "Tiny Crown", category: "hat", cost: 80, assetRef: "crown" },
  { key: "outfit_hoodie", name: "Comfy Hoodie", category: "outfit", cost: 40, assetRef: "hoodie" },
  { key: "outfit_armor", name: "Explorer Vest", category: "outfit", cost: 60, assetRef: "vest" },
  { key: "accessory_glasses", name: "Cool Glasses", category: "accessory", cost: 25, assetRef: "glasses" },
  { key: "accessory_scarf", name: "Striped Scarf", category: "accessory", cost: 25, assetRef: "scarf" },
  { key: "background_forest", name: "Forest Trail", category: "background", cost: 35, assetRef: "forest" },
  { key: "background_space", name: "Starry Sky", category: "background", cost: 50, assetRef: "space" },
  { key: "background_beach", name: "Sunny Beach", category: "background", cost: 35, assetRef: "beach" },
  { key: "theme_sunset", name: "Sunset Theme", category: "theme", cost: 45, assetRef: "sunset" },
];
