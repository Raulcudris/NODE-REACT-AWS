import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// Routes
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";

const app = express();

// =============================
// 🔧 CONFIG
// =============================
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = Number(process.env.PORT || 8800);

// Manejo de __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 🌍 Obtener IP pública EC2
// =============================
async function getPublicIP() {
  try {
    const res = await fetch("http://169.254.169.254/latest/meta-data/public-ipv4");
    if (!res.ok) throw new Error("Metadata not available");
    return await res.text();
  } catch (err) {
    return "IP_NOT_AVAILABLE";
  }
}

// =============================
// 🛡 CORS
// =============================
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.options("*", cors());

// =============================
// Middlewares
// =============================
app.use(express.json());
app.use(cookieParser());

// =============================
// Servir carpeta PUBLIC
// =============================
app.use(express.static(path.join(__dirname, "public")));

// =============================
// HEALTH CHECK — FIXED
// =============================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Backend API",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// =============================
// API ROUTES
// =============================
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// =============================
// 🚀 Run Server
// =============================
app.listen(PORT, "0.0.0.0", async () => {
  const publicIP = await getPublicIP();

  console.log("==========================================");
  console.log(`🚀 Server running at: http://${publicIP}:${PORT}`);
  console.log(`🌍 Public IP: ${publicIP}`);
  console.log(`🔐 Allowed CORS: ${CLIENT_URL}`);
  console.log("==========================================");
});
