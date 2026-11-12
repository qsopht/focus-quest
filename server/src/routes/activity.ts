import { Router } from "express";
import { wrapAsync } from "../lib/asyncRouter";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { awardOncePerDay, XP_ACTIONS, XP_REASONS } from "../lib/xp";

export const activityRouter = wrapAsync(Router());
activityRouter.use(requireAuth);

// Once-per-day planning actions. Idempotency lives in awardOncePerDay, so
// calling these more than once in a day (e.g. a page re-mount) is harmless.

activityRouter.post("/checkin", async (req: AuthedRequest, res) => {
  const xp = await awardOncePerDay(req.studentId!, XP_REASONS.DAILY_CHECKIN, XP_ACTIONS.DAILY_CHECKIN);
  res.json({ xp });
});

activityRouter.post("/review-upcoming", async (req: AuthedRequest, res) => {
  const xp = await awardOncePerDay(req.studentId!, XP_REASONS.REVIEW_UPCOMING, XP_ACTIONS.REVIEW_UPCOMING);
  res.json({ xp });
});
