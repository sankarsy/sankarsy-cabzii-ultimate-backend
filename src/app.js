const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { sanitize } = require("express-mongo-sanitize");
const apiRoutes = require("./routes");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const app = express();

const allowedOrigins = env.frontendUrl
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
// Trusted loopback IPs — the Next.js server (SSG build + server-side proxy)
// runs on the same machine; rate-limiting it 429s the whole site.
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => LOOPBACK_IPS.has(req.ip)
  })
);
app.use(express.json({ limit: "1mb" }));

/* Strip $/. operators from user input (NoSQL injection guard).
   Express 5 makes req.query a getter, so sanitize body/params directly
   instead of using the package middleware (which reassigns req.query). */
app.use((req, _res, next) => {
  if (req.body) sanitize(req.body, { replaceWith: "_" });
  if (req.params) sanitize(req.params, { replaceWith: "_" });
  next();
});

app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "cabzii.in backend running" });
});

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
