"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config({ path: path.join(__dirname, ".env") });

const { authenticate, ensureActiveUser } = require("./src/middleware/auth");
const { errorHandler } = require("./src/middleware/errorHandler");

// ── Existing routes ───────────────────────────────────────────────────────────
const { authRoutes }           = require("./src/routes/auth.routes");
const patientRoutes            = require("./src/routes/patient.routes");
const { staffRoutes }          = require("./src/routes/staff.routes");
const { appointmentRoutes }    = require("./src/routes/appointment.routes");
const { therapyRoutes }        = require("./src/routes/therapy.routes");
const { notificationRoutes }   = require("./src/routes/notification.routes");
const { doctorRoutes }         = require("./src/routes/doctor.routes");
const { serviceRoutes }        = require("./src/routes/service.routes");
const galleryRoutes            = require("./src/routes/gallery.routes");
const { recommendationRoutes } = require("./src/routes/recommendation.routes");
const { messageRoutes }        = require("./src/routes/message.routes");
const { prescriptionRoutes }   = require("./src/routes/prescription.routes");
const recommendationController = require("./src/controllers/recommendation.controller");
const uploadRoutes             = require("./src/routes/uploadRoutes");

// ── NEW routes ────────────────────────────────────────────────────────────────
const screeningRoutes            = require("./src/routes/screening.routes");       // default export
const adminScreeningRoutes       = require("./src/routes/admin.screening.routes"); // default export
const { emailRoutes }            = require("./src/routes/email.routes");           // named export
const { reportsRoutes }          = require("./src/routes/reports.routes");         // named export
const { internRoutes }           = require("./src/routes/intern.routes");          // named export
const { internPublicRoutes }     = require("./src/routes/intern.public.routes");   // named export

const app  = express();
const PORT = Number(process.env.PORT || 5001);

const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (origins.includes(origin)) return true;
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "lifeways-api" });
});

const api = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
api.use("/auth",      authRoutes);
api.use("/doctors",   doctorRoutes);
api.use("/services",  serviceRoutes);
api.use("/gallery",   galleryRoutes);
api.use("/interns",   internPublicRoutes);
api.use("/screening", screeningRoutes);

api.post("/recommendations/assess", recommendationController.assess);
api.get(
  "/settings/hospital",
  require("./src/controllers/admin.settings.controller").getHospital,
);

// ── Protected routes ──────────────────────────────────────────────────────────
api.use(authenticate({ required: true }));
api.use(ensureActiveUser);

api.use("/patients",        patientRoutes);
api.use("/admin",           require("./src/routes/admin.routes").adminRoutes);
api.use("/admin/screenings", adminScreeningRoutes);
api.use("/staff",           staffRoutes);
api.use("/appointments",    appointmentRoutes);
api.use(therapyRoutes);
api.use("/notifications",   notificationRoutes);
api.use("/messages",        messageRoutes);
api.use("/prescriptions",   prescriptionRoutes);
api.use("/recommendations", recommendationRoutes);
api.use("/upload",          uploadRoutes);
api.use("/email",           emailRoutes);
api.use("/reports",         reportsRoutes);
api.use("/interns",         internRoutes);

app.use("/api", api);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use(errorHandler);

// ── Socket.io Setup for Waiting Room ─────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const { registerWaitingRoom } = require("./src/socket/waitingRoom");
const waitingNamespace = io.of("/waiting");
registerWaitingRoom(waitingNamespace);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `Stop the other backend process, or run: npm run dev\n` +
        `(dev script frees the port automatically on Windows)\n`,
    );
    process.exit(1);
  }
  console.error("[server] failed to start:", err);
  process.exit(1);
});

server.listen(PORT, async () => {
  console.log(`Life Ways API listening on http://localhost:${PORT}`);
  console.log(`Socket.io waiting namespace available at http://localhost:${PORT}/waiting`);
  try {
    const { ensureScreeningBootstrap } = require("./src/bootstrap/screening.bootstrap");
    await ensureScreeningBootstrap();
  } catch (err) {
    console.warn("[server] screening bootstrap skipped:", err.message);
  }
  try {
    const { ensureNotificationsSchema } = require("./src/bootstrap/notifications.bootstrap");
    await ensureNotificationsSchema();
  } catch (err) {
    console.warn("[server] notifications schema bootstrap skipped:", err.message);
  }
  try {
    const { startNotificationJobs } = require("./src/jobs/notification.jobs");
    startNotificationJobs();
  } catch (err) {
    console.warn("[server] notification jobs unavailable:", err.message);
  }
});