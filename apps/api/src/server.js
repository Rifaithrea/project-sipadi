import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import archiveRoutes from "./routes/archives.js";
import dispositionRoutes from "./routes/dispositions.js";
import organizationRoutes from "./routes/organization.js";
import reportRoutes from "./routes/reports.js";
import auditLogRoutes from "./routes/auditLogs.js";
import userRoutes from "./routes/users.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "sipadi-api",
    time: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/archives", archiveRoutes);
app.use("/api/dispositions", dispositionRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`SIPADI API berjalan di http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
