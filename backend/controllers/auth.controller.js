import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log(username, email, password)

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password are required." });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ message: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({ message: "User created successfully" });
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
      return res
        .status(400)
        .json({ message: "username and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return res.status(401).json({ message: "Invalid Credentials!" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid Credentials!" });

    const cookieAgeMs = 1000 * 60 * 60 * 24 * 7;

    const token = jwt.sign(
      { id: user.id, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, ...userInfo } = user;

    return res
      .cookie("token", token, {
        httpOnly: true,
        maxAge: cookieAgeMs,
        sameSite: "lax",
        secure: false, // pon true cuando uses HTTPS
      })
      .status(200)
      .json(userInfo);
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
      secure: false, // true en HTTPS
    })
    .status(200)
    .json({ message: "Logout Successful" });
};