import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { buildRecommendation, Recommendation, RecommendationMode } from "../lib/recommend";

export const recommendationsRouter = wrapAsync(Router());
recommendationsRouter.use(requireAuth);

function entityFor(recommendation: Recommendation): { type: string; id: string | null; reason: string } {
  switch (recommendation.type) {
    case "assignment_step":
      return { type: "assignment_step", id: recommendation.stepId, reason: recommendation.reason };
    case "assignment":
      return { type: "assignment", id: recommendation.assignmentId, reason: recommendation.reason };
    case "brain_dump":
      return { type: "brain_dump", id: recommendation.brainDumpId, reason: recommendation.reason };
    case "organizational":
      return { type: "organizational", id: recommendation.entityId, reason: recommendation.reason };
    case "all_caught_up":
      return { type: "all_caught_up", id: null, reason: "Nothing outstanding right now." };
  }
}

recommendationsRouter.post("/next", async (req: AuthedRequest, res) => {
  const mode: RecommendationMode = req.body?.mode === "easier" ? "easier" : "normal";
  const excludes = {
    assignmentIds: Array.isArray(req.body?.excludeAssignmentIds) ? req.body.excludeAssignmentIds : [],
    stepIds: Array.isArray(req.body?.excludeStepIds) ? req.body.excludeStepIds : [],
    brainDumpIds: Array.isArray(req.body?.excludeBrainDumpIds) ? req.body.excludeBrainDumpIds : [],
  };

  const recommendation = await buildRecommendation(req.studentId!, mode, excludes);
  const entity = entityFor(recommendation);

  const history = await prisma.recommendationHistory.create({
    data: {
      studentId: req.studentId!,
      recommendedEntityType: entity.type,
      recommendedEntityId: entity.id,
      recommendationReason: entity.reason,
      mode,
    },
  });

  res.json({ recommendation, historyId: history.id });
});

recommendationsRouter.post("/:id/accept", async (req: AuthedRequest, res) => {
  const updated = await prisma.recommendationHistory.updateMany({
    where: { id: req.params.id, studentId: req.studentId },
    data: { accepted: true },
  });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

recommendationsRouter.post("/:id/dismiss", async (req: AuthedRequest, res) => {
  const updated = await prisma.recommendationHistory.updateMany({
    where: { id: req.params.id, studentId: req.studentId },
    data: { accepted: false },
  });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});
