import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { createPreOrder } from "../controllers/preorders.controller.js";

const router = express.Router();

// Si quieres permitir preorden como invitado SIN login, quita verifyToken aquí.
// Yo lo dejo con verifyToken porque tú manejas cookie; pero puedes hacerlo público.
router.post("/", verifyToken, createPreOrder);

export default router;
