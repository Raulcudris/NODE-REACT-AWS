import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "username and password are required.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        message: "Username already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || "CUSTOMER",
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.log("REGISTER_ERROR:", error);
    return res.status(500).json({
      message: "Failed to create user!",
      detail: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "username and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }

    const token = jwt.sign(
      {
        id: user.id.toString(), // 🔥 importante
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: false, // true en HTTPS
      })
      .status(200)
      .json({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      });
  } catch (error) {
    console.log("LOGIN_ERROR:", error);
    return res.status(500).json({
      message: "Failed to login!",
      detail: error.message,
    });
  }
};

export const logout = (req, res) => {
  return res
    .clearCookie("token", {
      sameSite: "lax",
      secure: false,
    })
    .status(200)
    .json({ message: "Logout Successful" });
};
