// Deterministic, rule-based step suggestions. This is intentionally NOT an
// AI call — the spec requires core functionality (including breakdown) to
// work without any external AI API. A real "Break this down for me" AI
// feature could later replace/augment this function's output without
// touching any caller, since the signature (title, subjectName) -> string[]
// stays the same.

const KEYWORD_TEMPLATES: { match: RegExp; steps: string[] }[] = [
  {
    match: /project/i,
    steps: [
      "Choose a topic",
      "Research the topic",
      "Write an outline",
      "Complete the first draft",
      "Create the final version",
      "Submit the project",
    ],
  },
  {
    match: /essay|paper|writ/i,
    steps: ["Plan main ideas", "Write a rough draft", "Revise and edit", "Proofread", "Submit"],
  },
  {
    match: /read|book|chapter/i,
    steps: ["Read the assigned pages", "Jot down key points", "Answer any questions"],
  },
  {
    match: /study|test|quiz|exam/i,
    steps: ["Gather notes and materials", "Review key topics", "Do a practice run", "Quick final review"],
  },
  {
    match: /worksheet|packet|problems?/i,
    steps: ["Read the instructions", "Work through the problems", "Double-check answers"],
  },
  {
    match: /present|slides?/i,
    steps: ["Outline the main points", "Build the slides", "Practice saying it out loud"],
  },
];

const SUBJECT_FALLBACKS: Record<string, string[]> = {
  Math: ["Review the example problems", "Work through the problem set", "Check your answers"],
  Science: ["Review notes or the lab", "Complete the assignment", "Double-check your work"],
  English: ["Read the prompt carefully", "Draft your response", "Review and submit"],
  "Social Studies": ["Review the reading or notes", "Answer the questions", "Submit your work"],
};

const GENERIC_FALLBACK = ["Get your materials ready", "Work on it for a bit", "Finish it up"];

export function suggestSteps(title: string, subjectName?: string | null): string[] {
  for (const template of KEYWORD_TEMPLATES) {
    if (template.match.test(title)) return template.steps;
  }
  if (subjectName && SUBJECT_FALLBACKS[subjectName]) return SUBJECT_FALLBACKS[subjectName];
  return GENERIC_FALLBACK;
}
