import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getMyCustomer,
  createMyCustomer,
  updateMyCustomer,
  getCustomers,
  getCustomerById
} from "../controllers/customers.controller.js";

const router = express.Router();

router.get("/me", verifyToken, getMyCustomer);
router.post("/me", verifyToken, createMyCustomer);
router.put("/me", verifyToken, updateMyCustomer);

// 👇 ESTA ES LA RUTA PARA LISTAR TODOS
router.get("/", verifyToken, getCustomers);

// 👇 Obtener uno por ID
router.get("/:id", verifyToken, getCustomerById);

export default router;
