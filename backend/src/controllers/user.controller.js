import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

export const getUsers = async (req, res) => {
  try {
    // recomendado: solo ADMIN
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { id: "asc" },
    });

    res.status(200).json(users.map(u => ({ ...u, id: u.id.toString() })));
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get users!" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = req.params.id;            // string
    const tokenUserId = req.userId;      // string
    const isAdmin = req.userRole === "ADMIN";

    if (!isAdmin && id !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    const { password, role, ...inputs } = req.body;

    // solo admin puede cambiar role
    if (role && !isAdmin) {
      return res.status(403).json({ message: "Only ADMIN can change role." });
    }

    const data = { ...inputs };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      data.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(id) },
      data,
      select: { id: true, username: true, role: true, createdAt: true },
    });

    res.status(200).json({ ...updatedUser, id: updatedUser.id.toString() });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update user!" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const tokenUserId = req.userId;
    const isAdmin = req.userRole === "ADMIN";

    if (!isAdmin && id !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    await prisma.user.delete({ where: { id: BigInt(id) } });
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to delete user!" });
  }
};
