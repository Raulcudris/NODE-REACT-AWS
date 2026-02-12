import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = Number(process.env.PORT || 8800);

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================
// CORS CONFIG
// ===========================
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors());

// Middlewares
app.use(express.json());
app.use(cookieParser());

// ===========================
// SERVIR ARCHIVOS ESTÁTICOS
// ===========================
app.use(express.static(path.join(__dirname, "public")));

// ===========================
// HEALTH CHECK
// ===========================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Backend API",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    corsOrigin: CLIENT_URL,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// ===========================
// API ROUTES
// ===========================
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// ===========================
// Fallback para index.html
// (permite cargar frontend SPA)
// ===========================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===========================
// SERVER START
// ===========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`🌐 Accepting requests from: ${CLIENT_URL}`);
});
