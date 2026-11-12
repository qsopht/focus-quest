import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useMe } from "./api/hooks";
import { Nav } from "./components/Nav";
import { ReminderPoller } from "./components/ReminderPoller";
import { BrainDumpFab } from "./components/BrainDumpFab";
import ProfilePicker from "./pages/ProfilePicker";
import Home from "./pages/Home";
import MyQuests from "./pages/MyQuests";
import CalendarPage from "./pages/Calendar";
import Focus from "./pages/Focus";
import Rewards from "./pages/Rewards";
import Settings from "./pages/Settings";
import BrainDump from "./pages/BrainDump";

export default function App() {
  const { isAuthed, logout } = useAuth();
  // If the stored token no longer resolves to a real student (deleted account,
  // reseeded dev database, expired session), bounce back to the profile
  // picker instead of leaving the app stuck on blank screens.
  const { isError } = useMe(isAuthed);

  useEffect(() => {
    if (isAuthed && isError) logout();
  }, [isAuthed, isError, logout]);

  if (!isAuthed) {
    return <ProfilePicker />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Nav />
      <ReminderPoller />
      <BrainDumpFab />
      <main className="min-w-0 flex-1 pb-20 sm:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quests" element={<MyQuests />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/brain-dump" element={<BrainDump />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
