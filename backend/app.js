import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // En Node 18+ puedes eliminar esta línea

import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = Number(process.env.PORT || 8800);

// =============================
// Obtener __dirname en ES Modules
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 🔥 Función para obtener IP pública en EC2
// =============================
async function getPublicIP() {
  try {
    const res = await fetch(
      "http://169.254.169.254/latest/meta-data/public-ipv4",
      { timeout: 2000 }
    );
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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors());

// =============================
// Middlewares
// =============================
app.use(express.json());
app.use(cookieParser());

// =============================
// Servir archivos estáticos => public/index.html
// =============================
app.use(express.static(path.join(__dirname, "public")));

// =============================
// Health Check
// =============================
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

// =============================
// Rutas API
// =============================
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// =============================
// 🚀 Iniciar servidor
// =============================
app.listen(PORT, "0.0.0.0", async () => {
  const publicIP = await getPublicIP();

  console.log("==========================================");
  console.log(`🚀 Server running on: http://${publicIP}:${PORT}`);
  console.log(`🌍 Public IP detected: ${publicIP}`);
  console.log(`🔐 CORS allowed origin: ${CLIENT_URL}`);
  console.log("==========================================");
});
