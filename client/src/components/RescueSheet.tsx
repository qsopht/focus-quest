import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Shuffle, Sparkles, Timer } from "lucide-react";
import { Sheet } from "./Sheet";
import { SubjectBadge } from "./SubjectBadge";
import {
  useAcceptRecommendation,
  useCompleteAssignment,
  useConvertBrainDumpToAssignment,
  useConvertBrainDumpToChecklist,
  useConvertBrainDumpToReminder,
  useDismissRecommendation,
  useKeepBrainDumpAsNote,
  useNextRecommendation,
  useToggleChecklistItem,
} from "../api/hooks";
import { useCelebration } from "../context/CelebrationContext";
import type { Recommendation } from "../types";

interface Excludes {
  assignmentIds: string[];
  stepIds: string[];
  brainDumpIds: string[];
}

function addExclude(excludes: Excludes, recommendation: Recommendation): Excludes {
  switch (recommendation.type) {
    case "assignment_step":
      return { ...excludes, stepIds: [...excludes.stepIds, recommendation.stepId] };
    case "assignment":
      return { ...excludes, assignmentIds: [...excludes.assignmentIds, recommendation.assignmentId] };
    case "brain_dump":
      return { ...excludes, brainDumpIds: [...excludes.brainDumpIds, recommendation.brainDumpId] };
    default:
      return excludes;
  }
}

export function RescueSheet({
  onClose,
  onBreakDown,
}: {
  onClose: () => void;
  onBreakDown: (assignmentId: string) => void;
}) {
  const navigate = useNavigate();
  const nextRecommendation = useNextRecommendation();
  const acceptRecommendation = useAcceptRecommendation();
  const dismissRecommendation = useDismissRecommendation();
  const completeAssignment = useCompleteAssignment();
  const toggleChecklistItem = useToggleChecklistItem();
  const convertToAssignment = useConvertBrainDumpToAssignment();
  const convertToReminder = useConvertBrainDumpToReminder();
  const convertToChecklist = useConvertBrainDumpToChecklist();
  const keepAsNote = useKeepBrainDumpAsNote();
  const { celebrateXp } = useCelebration();

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [excludes, setExcludes] = useState<Excludes>({ assignmentIds: [], stepIds: [], brainDumpIds: [] });
  const [takingBreak, setTakingBreak] = useState(false);

  const fetchNext = async (mode: "normal" | "easier", withExcludes: Excludes) => {
    const result = await nextRecommendation.mutateAsync({
      mode,
      excludeAssignmentIds: withExcludes.assignmentIds,
      excludeStepIds: withExcludes.stepIds,
      excludeBrainDumpIds: withExcludes.brainDumpIds,
    });
    setRecommendation(result.recommendation);
    setHistoryId(result.historyId);
  };

  useEffect(() => {
    fetchNext("normal", excludes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDifferent = async (mode: "normal" | "easier") => {
    if (historyId) dismissRecommendation.mutate(historyId);
    const nextExcludes = recommendation ? addExclude(excludes, recommendation) : excludes;
    setExcludes(nextExcludes);
    setTakingBreak(false);
    await fetchNext(mode, nextExcludes);
  };

  const accept = () => {
    if (historyId) acceptRecommendation.mutate(historyId);
  };

  const startFocusFor = (assignmentId: string | undefined, durationMinutes: number) => {
    accept();
    navigate("/focus", { state: { autoStart: { assignmentId, durationMinutes } } });
    onClose();
  };

  const handlePrimary = async () => {
    if (!recommendation) return;

    if (recommendation.type === "assignment") {
      if (recommendation.allStepsDone) {
        accept();
        const result = await completeAssignment.mutateAsync(recommendation.assignmentId);
        if (result.xp) celebrateXp(result.xp, "quest_complete");
        onClose();
        return;
      }
      startFocusFor(recommendation.assignmentId, recommendation.estimatedMinutes);
      return;
    }

    if (recommendation.type === "assignment_step") {
      startFocusFor(recommendation.assignmentId, recommendation.estimatedMinutes);
      return;
    }

    if (recommendation.type === "brain_dump") {
      accept();
      const { brainDumpId, suggestedCategory } = recommendation;
      if (suggestedCategory === "assignment") {
        await convertToAssignment.mutateAsync({ id: brainDumpId });
      } else if (suggestedCategory === "checklist") {
        await convertToChecklist.mutateAsync(brainDumpId);
      } else if (suggestedCategory === "reminder") {
        await convertToReminder.mutateAsync(brainDumpId);
      } else {
        await keepAsNote.mutateAsync(brainDumpId);
      }
      celebrateXp({ amount: 5, stars: 3, unlocked: [] }, "brain_dump_processed");
      onClose();
      return;
    }

    if (recommendation.type === "organizational") {
      accept();
      if (recommendation.action === "pack_item") {
        const result = await toggleChecklistItem.mutateAsync(recommendation.entityId);
        if (result.xp) celebrateXp(result.xp, "organizing");
        onClose();
      } else if (recommendation.action === "add_due_date") {
        onBreakDown(recommendation.entityId); // reuses the same "open quest detail" escape hatch
        onClose();
      } else {
        navigate("/brain-dump");
        onClose();
      }
    }
  };

  if (takingBreak) {
    return (
      <Sheet title="Take a breather" onClose={onClose}>
        <div className="flex flex-col items-center py-6 text-center">
          <Coffee size={40} className="text-brand-500" />
          <p className="mt-4 text-slate-600">
            No pressure — stretch, grab some water, or just breathe for a minute. Everything will still be here when
            you're ready.
          </p>
          <button onClick={onClose} className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">
            Okay
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="What Should I Do Now?" onClose={onClose}>
      {!recommendation ? (
        <p className="py-8 text-center text-slate-400">Thinking it through...</p>
      ) : recommendation.type === "all_caught_up" ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-xl font-bold text-slate-800">You're all caught up! Nice work.</h2>
          <p className="mt-1 text-slate-500">Nothing outstanding right now. Here are some other things you could do:</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2 text-sm font-semibold">
            <button onClick={() => (navigate("/calendar"), onClose())} className="rounded-xl bg-slate-100 py-2.5 text-slate-600">
              Review tomorrow
            </button>
            <button onClick={() => (navigate("/settings"), onClose())} className="rounded-xl bg-slate-100 py-2.5 text-slate-600">
              Check backpack
            </button>
            <button onClick={() => (navigate("/brain-dump"), onClose())} className="rounded-xl bg-slate-100 py-2.5 text-slate-600">
              Brain Dump
            </button>
            <button onClick={() => (navigate("/rewards"), onClose())} className="rounded-xl bg-slate-100 py-2.5 text-slate-600">
              Customize avatar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-500">Don't worry about everything else right now. Let's start with one thing.</p>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
            {(recommendation.type === "assignment_step" || recommendation.type === "assignment") && recommendation.subject && (
              <div className="mb-2">
                <SubjectBadge subject={{ ...recommendation.subject, isDefault: false, id: recommendation.subject.name }} />
              </div>
            )}
            <h2 className="text-xl font-bold">
              {recommendation.type === "assignment_step"
                ? recommendation.title
                : recommendation.type === "assignment"
                ? recommendation.title
                : recommendation.type === "brain_dump"
                ? recommendation.text
                : recommendation.title}
            </h2>
            {recommendation.type === "assignment_step" && (
              <p className="mt-0.5 text-sm text-brand-100">from "{recommendation.assignmentTitle}"</p>
            )}
            {recommendation.type === "assignment_step" && (
              <p className="mt-1 text-sm text-brand-100">Estimated time: {recommendation.estimatedMinutes} minutes</p>
            )}
            {recommendation.type === "assignment" && !recommendation.allStepsDone && (
              <p className="mt-1 text-sm text-brand-100">Estimated time: {recommendation.estimatedMinutes} minutes</p>
            )}
            <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm backdrop-blur">{recommendation.reason}</p>
          </div>

          <button
            onClick={handlePrimary}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-lg font-bold text-white shadow hover:bg-brand-700"
          >
            {recommendation.type === "assignment" && recommendation.allStepsDone ? (
              "Mark it complete!"
            ) : recommendation.type === "assignment" || recommendation.type === "assignment_step" ? (
              <>
                <Timer size={18} /> Start {recommendation.estimatedMinutes}-Minute Focus Session
              </>
            ) : (
              "Let's Do This!"
            )}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => requestDifferent("easier")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              <Sparkles size={14} /> Give Me Something Easier
            </button>
            <button
              onClick={() => requestDifferent("normal")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              <Shuffle size={14} /> Show Me Another
            </button>
            {recommendation.type === "assignment" && !recommendation.allStepsDone && (
              <button
                onClick={() => {
                  if (historyId) dismissRecommendation.mutate(historyId);
                  onBreakDown(recommendation.assignmentId);
                  onClose();
                }}
                className="col-span-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Break This Assignment Down
              </button>
            )}
            <button
              onClick={() => {
                if (historyId) dismissRecommendation.mutate(historyId);
                setTakingBreak(true);
              }}
              className="col-span-2 rounded-xl py-2 text-sm font-medium text-slate-400 hover:text-slate-600"
            >
              I Need a Short Break
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
