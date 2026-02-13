import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createOrder } from "../controllers/orders.controller.js";

const router = express.Router();

// Crear orden (requiere login -> customer vinculado por user_id)
router.post("/", verifyToken, createOrder);

export default router;
