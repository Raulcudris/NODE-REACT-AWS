import prisma from "../lib/prisma.js";

const toCustomerDTO = (c) => ({
  id: c.id.toString(),
  userId: c.userId ? c.userId.toString() : null,
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  country: c.country,
  postalCode: c.postalCode,
  createdAt: c.createdAt,
});

export const getMyCustomer = async (req, res) => {
  try {
    const userId = BigInt(req.userId);

    const customer = await prisma.customer.findFirst({
      where: { userId },
    });

    if (!customer) return res.status(404).json({ message: "Customer profile not found" });

    res.status(200).json(toCustomerDTO(customer));
  } catch (err) {
    console.log("GET_MY_CUSTOMER_ERROR:", err);
    res.status(500).json({ message: "Failed to get customer profile!" });
  }
};

export const createMyCustomer = async (req, res) => {
  try {
    const userId = BigInt(req.userId);
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      postalCode,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "firstName, lastName and email are required" });
    }

    // 1) Evitar que un usuario cree 2 perfiles
    const existingForUser = await prisma.customer.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (existingForUser) {
      return res.status(409).json({ message: "Customer profile already exists for this user" });
    }

    // 2) Crear customer vinculado al user_id
    const customer = await prisma.customer.create({
      data: {
        userId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ?? null,
        address: address ?? null,
        city: city ?? null,
        country: country ?? null,
        postalCode: postalCode ?? null,
      },
    });

    res.status(201).json(toCustomerDTO(customer));
  } catch (err) {
    console.log("CREATE_MY_CUSTOMER_ERROR:", err);

    // Email unique
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(500).json({ message: "Failed to create customer profile!" });
  }
};

export const updateMyCustomer = async (req, res) => {
  try {
    const userId = BigInt(req.userId);

    const existing = await prisma.customer.findFirst({
      where: { userId },
    });

    if (!existing) return res.status(404).json({ message: "Customer profile not found" });

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      postalCode,
    } = req.body;

    // Validaciones suaves (si vienen)
    if (firstName !== undefined && String(firstName).trim().length === 0) {
      return res.status(400).json({ message: "firstName cannot be empty" });
    }
    if (lastName !== undefined && String(lastName).trim().length === 0) {
      return res.status(400).json({ message: "lastName cannot be empty" });
    }
    if (email !== undefined && String(email).trim().length === 0) {
      return res.status(400).json({ message: "email cannot be empty" });
    }

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(firstName !== undefined ? { firstName: String(firstName).trim() } : {}),
        ...(lastName !== undefined ? { lastName: String(lastName).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
        ...(phone !== undefined ? { phone: phone ?? null } : {}),
        ...(address !== undefined ? { address: address ?? null } : {}),
        ...(city !== undefined ? { city: city ?? null } : {}),
        ...(country !== undefined ? { country: country ?? null } : {}),
        ...(postalCode !== undefined ? { postalCode: postalCode ?? null } : {}),
      },
    });

    res.status(200).json(toCustomerDTO(updated));
  } catch (err) {
    console.log("UPDATE_MY_CUSTOMER_ERROR:", err);

    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(500).json({ message: "Failed to update customer profile!" });
  }
};

// --------------------------
// (Opcional) ADMIN endpoints
// --------------------------
export const getCustomers = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    const customers = await prisma.customer.findMany({
      orderBy: { id: "asc" },
    });

    res.status(200).json(customers.map(toCustomerDTO));
  } catch (err) {
    console.log("GET_CUSTOMERS_ERROR:", err);
    res.status(500).json({ message: "Failed to get customers!" });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    const id = BigInt(req.params.id);

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    res.status(200).json(toCustomerDTO(customer));
  } catch (err) {
    console.log("GET_CUSTOMER_BY_ID_ERROR:", err);
    res.status(400).json({ message: "Invalid customer id" });
  }
};
