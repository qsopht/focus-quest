import { NavLink } from "react-router-dom";
import { Calendar, Home, ListTodo, Settings, Timer, Trophy } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/quests", label: "My Quests", icon: ListTodo },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/rewards", label: "Rewards", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  return (
    <>
      {/* Desktop / tablet side nav */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-slate-100 bg-white p-4 sm:flex">
        <div className="mb-4 px-2 text-xl font-extrabold text-brand-700">Focus Quest</div>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 py-1.5 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
                isActive ? "text-brand-600" : "text-slate-400"
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
