import {
  Backpack,
  Book,
  BookOpen,
  Brain,
  Calculator,
  CalendarCheck,
  Dumbbell,
  Flag,
  FlaskConical,
  Globe,
  Layers,
  ListChecks,
  MessageCircle,
  Moon,
  Palette,
  Puzzle,
  Sparkles,
  Star,
  Timer,
  Trophy,
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  calculator: Calculator,
  flask: FlaskConical,
  "book-open": BookOpen,
  globe: Globe,
  "message-circle": MessageCircle,
  palette: Palette,
  dumbbell: Dumbbell,
  star: Star,
  flag: Flag,
  "list-checks": ListChecks,
  timer: Timer,
  layers: Layers,
  trophy: Trophy,
  moon: Moon,
  "calendar-check": CalendarCheck,
  brain: Brain,
  backpack: Backpack,
  book: Book,
  sparkles: Sparkles,
  puzzle: Puzzle,
};

export function IconSymbol({ name, className, size = 18 }: { name: string; className?: string; size?: number }) {
  const Icon = ICONS[name] ?? Star;
  return <Icon className={className} size={size} aria-hidden="true" />;
}
