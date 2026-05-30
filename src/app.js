const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const apiRoutes = require("./routes");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const app = express();

// Normalise allowed origins (drop trailing slashes) so cabzii.in and the
// admin panel (served from the same origin at /admin) are matched reliably.
const allowedOrigins = env.frontendUrl
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = same-origin, server-to-server or curl — always allow.
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      // Disallowed: respond without CORS headers instead of throwing a 500.
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
// Allow uploaded images to be embedded on the frontend origin (api.cabzii.in -> cabzii.in).
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "cabzii.in backend running" });
});

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
