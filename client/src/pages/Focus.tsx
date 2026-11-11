import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/PageContainer";
import { ProgressRing } from "../components/ProgressRing";
import { SubjectBadge } from "../components/SubjectBadge";
import { useAssignments, useFinishFocusSession, useStartFocusSession } from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import type { Assignment } from "../types";

const DURATIONS = [5, 10, 15, 20];

type Phase = "setup" | "running" | "paused" | "done";

export default function Focus() {
  const { data: assignments } = useAssignments("active");
  const startSession = useStartFocusSession();
  const finishSession = useFinishFocusSession();
  const { celebrateXp } = useCelebration();

  const [duration, setDuration] = useState(10);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(duration * 60);
  const [elapsed, setElapsed] = useState(0);
  const [lastXp, setLastXp] = useState<number | null>(null);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && remaining === 0) {
      finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const selectedAssignment = assignments?.find((a: Assignment) => a.id === assignmentId) ?? null;

  const start = async () => {
    const session = await startSession.mutateAsync({ assignmentId: assignmentId ?? undefined, durationMinutes: duration });
    setSessionId(session.id);
    setRemaining(duration * 60);
    setElapsed(0);
    setPhase("running");
  };

  const finish = async (completed: boolean) => {
    if (!sessionId) return;
    setPhase("done");
    const result = await finishSession.mutateAsync({ id: sessionId, elapsedSeconds: elapsed, completed });
    setLastXp(result.xp?.amount ?? null);
    if (result.xp) celebrateXp(result.xp, completed ? "Focus session complete!" : "Nice effort!");
  };

  const reset = () => {
    setPhase("setup");
    setSessionId(null);
    setRemaining(duration * 60);
    setElapsed(0);
    setLastXp(null);
  };

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const displayMinutes = Math.max(1, Math.round(elapsed / 60));

  return (
    <PageContainer>
      <h1 className="text-2xl font-extrabold text-slate-800">Focus</h1>

      {phase === "setup" && (
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Work on something? (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAssignmentId(null)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !assignmentId ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                }`}
              >
                Just focus
              </button>
              {assignments?.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAssignmentId(a.id === assignmentId ? null : a.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    assignmentId === a.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {a.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">How long?</p>
            <div className="flex gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setDuration(m);
                    setRemaining(m * 60);
                  }}
                  className={`flex-1 rounded-xl border-2 py-3 text-center font-bold transition ${
                    duration === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={start}
            className="w-full rounded-2xl bg-brand-600 py-4 text-lg font-bold text-white shadow hover:bg-brand-700"
          >
            Start focusing
          </button>
          <p className="text-center text-sm text-slate-400">You can stop any time — no pressure.</p>
        </div>
      )}

      {(phase === "running" || phase === "paused") && (
        <div className="mt-10 flex flex-col items-center">
          {selectedAssignment && (
            <div className="mb-4">
              <SubjectBadge subject={selectedAssignment.subject} />
            </div>
          )}
          <ProgressRing progress={1 - remaining / (duration * 60)} size={220} stroke={14}>
            <div className="text-center">
              <div className="text-4xl font-extrabold tabular-nums text-slate-800">
                {minutes}:{seconds}
              </div>
              <div className="mt-1 text-sm text-slate-400">{phase === "paused" ? "Paused" : "Stay with it"}</div>
            </div>
          </ProgressRing>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setPhase(phase === "running" ? "paused" : "running")}
              className="flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 font-bold text-slate-700 hover:bg-slate-200"
            >
              {phase === "running" ? (
                <>
                  <Pause size={18} /> Pause
                </>
              ) : (
                <>
                  <Play size={18} /> Resume
                </>
              )}
            </button>
            <button
              onClick={() => finish(false)}
              className="flex items-center gap-2 rounded-2xl bg-rose-50 px-6 py-3 font-bold text-rose-600 hover:bg-rose-100"
            >
              <Square size={16} /> Stop
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-xl font-bold text-slate-800">
            {elapsed >= duration * 60 ? "Focus session complete!" : "Nice work getting started!"}
          </h2>
          <p className="mt-1 text-slate-500">
            You focused for {displayMinutes} minute{displayMinutes === 1 ? "" : "s"}.
          </p>
          {lastXp && <p className="mt-2 font-bold text-brand-600">+{lastXp} XP earned</p>}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Take a short break — stretch, grab some water, or just breathe for a minute.
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={reset} className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">
              Start another session
            </button>
            <Link to="/" className="rounded-xl bg-slate-100 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200">
              Back home
            </Link>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
