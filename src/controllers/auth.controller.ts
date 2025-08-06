import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET as string;

// 🔐 POST /auth/register — створення нового головного адміна
export const registerAdmin = async (req: Request, res: Response) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = adminRepo.create({
    username,
    password: hashedPassword,
    role: "admin", // ✳️ автоматично
  });

  const saved = await adminRepo.save(newAdmin);

  const token = jwt.sign({ adminId: saved.id, role: saved.role }, JWT_SECRET, {
    expiresIn: "2h",
  });

  res.status(201).json({ token });
};

// 📌 POST /auth/login
export const loginAdmin = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const adminRepository = AppDataSource.getRepository(Admin);
  const admin = await adminRepository.findOneBy({ username });

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ adminId: admin.id, role: admin.role }, JWT_SECRET, {
    expiresIn: "2h",
  });

  res.json({ token });
};

// 🔐 POST /auth/create-editor — створення редактора
export const createEditorAdmin = async (req: AuthRequest, res: Response) => {
  const { username, password, confirmPassword } = req.body;
  const creatorId = req.user!.adminId;

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newEditor = adminRepo.create({
    username,
    password: hashedPassword,
    role: "editor",
    createdBy: { id: creatorId } as any, // 👈 встановлюємо хто створив
  });

  const saved = await adminRepo.save(newEditor);

  const token = jwt.sign({ adminId: saved.id, role: saved.role }, JWT_SECRET, {
    expiresIn: "2h",
  });

  res.status(201).json({ token });
};
