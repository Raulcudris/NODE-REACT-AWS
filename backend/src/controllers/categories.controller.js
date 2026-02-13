import prisma from "../lib/prisma.js";

const toCategoryDTO = (c) => ({
  id: c.id.toString(),
  name: c.name,
  description: c.description,
  createdAt: c.createdAt,
});

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories.map(toCategoryDTO));
  } catch (err) {
    console.log("GET_CATEGORIES_ERROR:", err);
    res.status(500).json({ message: "Failed to get categories!" });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.status(200).json(toCategoryDTO(category));
  } catch (err) {
    console.log("GET_CATEGORY_ERROR:", err);
    res.status(400).json({ message: "Invalid category id" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ message: "name is required" });
    }

    const category = await prisma.category.create({
      data: {
        name: String(name).trim(),
        description: description ?? null,
      },
    });

    res.status(201).json(toCategoryDTO(category));
  } catch (err) {
    console.log("CREATE_CATEGORY_ERROR:", err);

    // Unique constraint violation (Prisma)
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Category name already exists" });
    }

    res.status(500).json({ message: "Failed to create category!" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const { name, description } = req.body;

    if (name !== undefined && String(name).trim().length === 0) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "Category not found" });

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
      },
    });

    res.status(200).json(toCategoryDTO(updated));
  } catch (err) {
    console.log("UPDATE_CATEGORY_ERROR:", err);

    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Category name already exists" });
    }

    res.status(400).json({ message: "Invalid request" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "Category not found" });

    await prisma.category.delete({ where: { id } });

    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    console.log("DELETE_CATEGORY_ERROR:", err);

    // Si hay productos asociados, MySQL puede bloquear por FK
    return res.status(409).json({
      message: "Cannot delete category. It may have products associated.",
    });
  }
};
