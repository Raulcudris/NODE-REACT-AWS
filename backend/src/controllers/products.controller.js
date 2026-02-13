import prisma from "../lib/prisma.js";

const toProductDTO = (p) => ({
  id: p.id.toString(),
  name: p.name,
  slug: p.slug,
  description: p.description,
  imageFolder: p.imageFolder,
  price: p.price, // Decimal: Prisma lo devuelve como string/Decimal según config
  stock: p.stock,
  ageRestricted: p.ageRestricted,
  categoryId: p.categoryId.toString(),
  createdAt: p.createdAt,
  category: p.category
    ? { id: p.category.id.toString(), name: p.category.name }
    : undefined,
});

const parseBool = (v) => {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return undefined;
};

const parseIntSafe = (v) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

export const getProducts = async (req, res) => {
  try {
    const {
      categoryId,
      inStock,
      minStock,
      ageRestricted,
      q,
      page = "1",
      pageSize = "20",
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseIntSafe(page) || 1);
    const sizeNum = Math.min(100, Math.max(1, parseIntSafe(pageSize) || 20));
    const skip = (pageNum - 1) * sizeNum;

    const inStockBool = parseBool(inStock);
    const ageRestrictedBool = parseBool(ageRestricted);
    const minStockNum = parseIntSafe(minStock);

    // Where dinámico
    const where = {};

    if (categoryId !== undefined) {
      where.categoryId = BigInt(categoryId);
    }

    if (ageRestrictedBool !== undefined) {
      where.ageRestricted = ageRestrictedBool;
    }

    // stock filters
    if (inStockBool === true) {
      where.stock = { gt: 0 };
    } else if (inStockBool === false) {
      where.stock = { equals: 0 };
    }

    if (minStockNum !== undefined) {
      where.stock = { ...(where.stock || {}), gte: minStockNum };
    }

    // search
    if (q && String(q).trim().length > 0) {
      where.name = {
        contains: String(q).trim(),
        mode: "insensitive",
      };
    }

    // sorting
    const allowedSort = new Set(["price", "createdAt", "name", "stock"]);
    const sortField = allowedSort.has(String(sort)) ? String(sort) : "createdAt";
    const sortOrder = String(order).toLowerCase() === "asc" ? "asc" : "desc";

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: sizeNum,
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      page: pageNum,
      pageSize: sizeNum,
      total,
      totalPages: Math.ceil(total / sizeNum),
      items: items.map(toProductDTO),
    });
  } catch (err) {
    console.log("GET_PRODUCTS_ERROR:", err);
    res.status(500).json({ message: "Failed to get products!" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(toProductDTO(product));
  } catch (err) {
    console.log("GET_PRODUCT_ERROR:", err);
    res.status(400).json({ message: "Invalid product id" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      imageFolder,
      price,
      stock,
      ageRestricted,
      categoryId,
    } = req.body;

    // Validaciones mínimas
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ message: "name is required" });
    }
    if (price === undefined || Number(price) < 0) {
      return res.status(400).json({ message: "price must be >= 0" });
    }
    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({ message: "stock must be >= 0" });
    }
    if (!categoryId) {
      return res.status(400).json({ message: "categoryId is required" });
    }

    // validar categoría existe
    const cat = await prisma.category.findUnique({
      where: { id: BigInt(categoryId) },
      select: { id: true, name: true },
    });
    if (!cat) return res.status(404).json({ message: "Category not found" });

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        slug: slug ? String(slug).trim() : null,
        description: description ?? null,
        imageFolder: imageFolder ?? null,
        price, // Prisma Decimal
        stock: Number(stock),
        ageRestricted: Boolean(ageRestricted),
        categoryId: BigInt(categoryId),
      },
      include: { category: true },
    });

    res.status(201).json(toProductDTO(product));
  } catch (err) {
    console.log("CREATE_PRODUCT_ERROR:", err);

    // Unique slug violation
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Product slug already exists" });
    }

    res.status(500).json({ message: "Failed to create product!" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ message: "Product not found" });

    const {
      name,
      slug,
      description,
      imageFolder,
      price,
      stock,
      ageRestricted,
      categoryId,
    } = req.body;

    // Si viene categoryId, validar categoría
    if (categoryId !== undefined) {
      const cat = await prisma.category.findUnique({
        where: { id: BigInt(categoryId) },
        select: { id: true },
      });
      if (!cat) return res.status(404).json({ message: "Category not found" });
    }

    // Validaciones si vienen
    if (price !== undefined && Number(price) < 0) {
      return res.status(400).json({ message: "price must be >= 0" });
    }
    if (stock !== undefined && Number(stock) < 0) {
      return res.status(400).json({ message: "stock must be >= 0" });
    }
    if (name !== undefined && String(name).trim().length === 0) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(slug !== undefined ? { slug: slug ? String(slug).trim() : null } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(imageFolder !== undefined ? { imageFolder: imageFolder ?? null } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(stock !== undefined ? { stock: Number(stock) } : {}),
        ...(ageRestricted !== undefined ? { ageRestricted: Boolean(ageRestricted) } : {}),
        ...(categoryId !== undefined ? { categoryId: BigInt(categoryId) } : {}),
      },
      include: { category: true },
    });

    res.status(200).json(toProductDTO(updated));
  } catch (err) {
    console.log("UPDATE_PRODUCT_ERROR:", err);

    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Product slug already exists" });
    }

    res.status(400).json({ message: "Invalid request" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ message: "Product not found" });

    await prisma.product.delete({ where: { id } });

    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    console.log("DELETE_PRODUCT_ERROR:", err);

    // Si está referenciado en order_items / pre_order_items por FK
    return res.status(409).json({
      message: "Cannot delete product. It may have order items associated.",
    });
  }
};
