import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { studentsRouter } from "./routes/students";
import { subjectsRouter } from "./routes/subjects";
import { assignmentsRouter } from "./routes/assignments";
import { focusSessionsRouter } from "./routes/focusSessions";
import { routinesRouter } from "./routes/routines";
import { remindersRouter } from "./routes/reminders";
import { calendarEventsRouter } from "./routes/calendarEvents";
import { achievementsRouter } from "./routes/achievements";
import { rewardsRouter } from "./routes/rewards";
import { checklistRouter } from "./routes/checklist";
import { brainDumpRouter } from "./routes/braindump";
import { recommendationsRouter } from "./routes/recommendations";
import { activityRouter } from "./routes/activity";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api", studentsRouter); // exposes /api/me
app.use("/api/subjects", subjectsRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/focus-sessions", focusSessionsRouter);
app.use("/api/routines", routinesRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/calendar-events", calendarEventsRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/rewards", rewardsRouter);
app.use("/api/checklist", checklistRouter);
app.use("/api/braindump", brainDumpRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/activity", activityRouter);

// Serve the built client as static files when it's present (Railway/production
// deploys build both workspaces and run only this server as a single process).
// In local dev, the client runs on its own Vite server instead and this never
// matches since client/dist doesn't exist.
const clientDist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

// Defense in depth: wrapAsync (lib/asyncRouter.ts) catches rejections from
// every route handler, but this is a last-resort net so one unexpected error
// anywhere never takes the whole server down for every student.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Focus Quest API listening on http://localhost:${PORT}`);
});
