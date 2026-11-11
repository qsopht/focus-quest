import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Profile {
  id: string;
  name: string;
  totalXp: number;
}

export default function ProfilePicker() {
  const { login } = useAuth();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile[]>("/auth/profiles").then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const pick = async (studentId: string) => {
    try {
      const result = await api.post<{ token: string }>("/auth/login", { studentId });
      login(result.token);
    } catch {
      setError("Couldn't log in. Try again.");
    }
  };

  const createProfile = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await api.post<{ token: string }>("/auth/profiles", { name: newName.trim() });
      login(result.token);
    } catch {
      setError("Couldn't create your profile. Try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-extrabold text-brand-700">Focus Quest</div>
          <p className="mt-1 text-slate-500">Who's playing today?</p>
        </div>

        {error && <p className="mb-3 text-center text-sm text-rose-600">{error}</p>}

        {profiles === null ? (
          <p className="text-center text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.totalXp} XP</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4">
          <p className="mb-2 text-sm font-medium text-slate-600">New here?</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProfile()}
              placeholder="Your name"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
            />
            <button
              onClick={createProfile}
              disabled={creating || !newName.trim()}
              className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
