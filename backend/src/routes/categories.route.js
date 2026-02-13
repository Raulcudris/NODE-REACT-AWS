import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/categories.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Públicos (catálogo)
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Protegidos (admin)
router.post("/", verifyToken, createCategory);
router.put("/:id", verifyToken, updateCategory);
router.delete("/:id", verifyToken, deleteCategory);

export default router;
