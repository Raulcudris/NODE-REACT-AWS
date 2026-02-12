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

// CORS (antes de rutas)
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

// Servir public/index.html en /
app.use(express.static(path.join(__dirname, "public")));

// Health endpoint (para que index.html lea info)
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

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`✅ CORS allowed origin: ${CLIENT_URL}`);
});