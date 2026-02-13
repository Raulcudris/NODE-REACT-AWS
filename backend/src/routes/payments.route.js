import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  createPayment,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "../controllers/payments.controller.js";

const router = express.Router();

router.post("/", verifyToken, createPayment);
router.get("/:orderId", verifyToken, getPaymentByOrderId);
router.patch("/:orderId/status", verifyToken, updatePaymentStatus);

export default router;
