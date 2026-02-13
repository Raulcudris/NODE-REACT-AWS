import express from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "../controllers/products.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Públicos (catálogo)
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protegidos (admin / operador)
router.post("/", verifyToken, createProduct);
router.put("/:id", verifyToken, updateProduct);
router.delete("/:id", verifyToken, deleteProduct);

export default router;
