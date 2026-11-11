import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Achievement,
  Assignment,
  AssignmentStep,
  BrainDumpEntry,
  CalendarEvent,
  ChecklistItem,
  FocusSession,
  MeSummary,
  Reminder,
  RewardItem,
  Routine,
  Subject,
  XpAward,
} from "../types";

// --- Me / profile summary ---

export function useMe(enabled = true) {
  return useQuery({ queryKey: ["me"], queryFn: () => api.get<MeSummary>("/me"), enabled });
}

function useInvalidateMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}

// --- Subjects ---

export function useSubjects() {
  return useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
}

// --- Assignments ---

export function useAssignments(bucket: string) {
  return useQuery({
    queryKey: ["assignments", bucket],
    queryFn: () => api.get<Assignment[]>(`/assignments?bucket=${bucket}`),
  });
}

function useInvalidateAssignments() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["assignments"] });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (payload: Partial<Assignment> & { title: string }) =>
      api.post<{ assignment: Assignment; xp: XpAward }>("/assignments", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      invalidateMe();
    },
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Assignment> & { id: string }) =>
      api.patch<Assignment>(`/assignments/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useCompleteAssignment() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (id: string) => api.post<{ assignment: Assignment; xp: XpAward | null }>(`/assignments/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      invalidateMe();
    },
  });
}

export function useReopenAssignment() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: (id: string) => api.post(`/assignments/${id}/reopen`),
    onSuccess: invalidate,
  });
}

export function useSuggestSteps() {
  return useMutation({
    mutationFn: (assignmentId: string) => api.get<{ steps: string[] }>(`/assignments/${assignmentId}/suggest-steps`),
  });
}

export function useAddSteps() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ assignmentId, titles }: { assignmentId: string; titles: string[] }) =>
      api.post<AssignmentStep[]>(`/assignments/${assignmentId}/steps`, { titles }),
    onSuccess: invalidate,
  });
}

export function useCompleteStep() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: ({ assignmentId, stepId }: { assignmentId: string; stepId: string }) =>
      api.post<{ step: AssignmentStep; xp: XpAward | null }>(`/assignments/${assignmentId}/steps/${stepId}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      invalidateMe();
    },
  });
}

export function useDeleteStep() {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ assignmentId, stepId }: { assignmentId: string; stepId: string }) =>
      api.delete(`/assignments/${assignmentId}/steps/${stepId}`),
    onSuccess: invalidate,
  });
}

// --- Focus sessions ---

export function useStartFocusSession() {
  return useMutation({
    mutationFn: (payload: { assignmentId?: string | null; durationMinutes: number }) =>
      api.post<FocusSession>("/focus-sessions", payload),
  });
}

export function useFinishFocusSession() {
  const invalidateMe = useInvalidateMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, elapsedSeconds, completed }: { id: string; elapsedSeconds: number; completed: boolean }) =>
      api.post<{ session: FocusSession; xp: XpAward | null }>(`/focus-sessions/${id}/finish`, {
        elapsedSeconds,
        completed,
      }),
    onSuccess: () => {
      invalidateMe();
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

// --- Routines ---

export function useRoutines() {
  return useQuery({ queryKey: ["routines"], queryFn: () => api.get<Routine[]>("/routines") });
}

export function useAddRoutineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, title }: { routineId: string; title: string }) =>
      api.post(`/routines/${routineId}/items`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useDeleteRoutineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/routines/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useCompleteRoutineItem() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (itemId: string) => api.post<{ completedToday: boolean; xp: XpAward | null }>(`/routines/items/${itemId}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      invalidateMe();
    },
  });
}

// --- Reminders ---

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: () => api.get<Reminder[]>("/reminders"),
    refetchInterval: 60_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message: string; remindAt: string; kind?: string; assignmentId?: string }) =>
      api.post<Reminder>("/reminders", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useDismissReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/reminders/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

// --- Calendar events ---

export function useCalendarEvents() {
  return useQuery({ queryKey: ["calendar-events"], queryFn: () => api.get<CalendarEvent[]>("/calendar-events") });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; date: string; type?: string }) =>
      api.post<CalendarEvent>("/calendar-events", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/calendar-events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

// --- Achievements ---

export function useAchievements() {
  return useQuery({ queryKey: ["achievements"], queryFn: () => api.get<Achievement[]>("/achievements") });
}

// --- Rewards ---

export function useRewards() {
  return useQuery({ queryKey: ["rewards"], queryFn: () => api.get<{ stars: number; items: RewardItem[] }>("/rewards") });
}

export function usePurchaseReward() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (id: string) => api.post(`/rewards/${id}/purchase`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      invalidateMe();
    },
  });
}

export function useEquipReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/rewards/${id}/equip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

export function useUnequipReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/rewards/${id}/unequip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

// --- Checklist ---

export function useChecklist() {
  return useQuery({ queryKey: ["checklist"], queryFn: () => api.get<ChecklistItem[]>("/checklist") });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => api.post<ChecklistItem>("/checklist", { label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist"] }),
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ChecklistItem>(`/checklist/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist"] }),
  });
}

export function useResetChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/checklist/reset`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist"] }),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/checklist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist"] }),
  });
}

// --- Brain dump ---

export function useBrainDump() {
  return useQuery({ queryKey: ["braindump"], queryFn: () => api.get<BrainDumpEntry[]>("/braindump") });
}

export function useAddBrainDump() {
  const qc = useQueryClient();
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (text: string) => api.post<{ entry: BrainDumpEntry; xp: XpAward }>("/braindump", { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["braindump"] });
      invalidateMe();
    },
  });
}

export function useConvertBrainDump() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ assignment: Assignment }>(`/braindump/${id}/convert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["braindump"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

export function useDeleteBrainDump() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/braindump/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["braindump"] }),
  });
}
