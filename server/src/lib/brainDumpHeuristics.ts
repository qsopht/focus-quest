// Deterministic, rule-based Brain Dump categorization — the same
// "no AI required" philosophy as lib/stepSuggestions.ts. This never blocks
// capture or organizing; it's purely an optional, friendly nudge.

export type SuggestedCategory = "assignment" | "reminder" | "checklist" | "note";

export interface CategorySuggestion {
  category: SuggestedCategory;
  label: string;
}

const RULES: { match: RegExp; category: SuggestedCategory; label: string }[] = [
  {
    match: /\b(ask|tell)\b.*\b(teacher|mr|mrs|ms|miss|professor)\b|\b(mr|mrs|ms)\.?\s+[A-Z]\w+/i,
    category: "reminder",
    label: "This might be something to ask your teacher.",
  },
  {
    match: /\b(bring|pack|don'?t forget|need my|grab)\b/i,
    category: "checklist",
    label: "This could be a school supply checklist item.",
  },
  {
    match: /\b(homework|worksheet|assignment|project|essay|report|study|quiz|test|exam|due)\b/i,
    category: "assignment",
    label: "This sounds like homework.",
  },
  {
    match: /\b(tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/i,
    category: "reminder",
    label: "This sounds like something to remember for a specific day.",
  },
];

export function suggestCategory(text: string): CategorySuggestion {
  for (const rule of RULES) {
    if (rule.match.test(text)) return { category: rule.category, label: rule.label };
  }
  return { category: "note", label: "Good to keep as a note for now." };
}
