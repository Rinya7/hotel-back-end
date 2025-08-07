import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET as string;

// 🔐 POST /auth/create-admin — тільки для superadmin
export const createAdminBySuperadmin = async (
  req: AuthRequest,
  res: Response
) => {
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
    role: "admin",
    isBlocked: false,
  });

  const saved = await adminRepo.save(newAdmin);

  res
    .status(201)
    .json({ message: "Admin created successfully", adminId: saved.id });
};
// 🔐 GET /auth/users — superadmin бачив усіх admin + їх editor'ів або admin бачив лише своїх editor'ів
export const getUsers = async (req: AuthRequest, res: Response) => {
  const adminRepo = AppDataSource.getRepository(Admin);
  const { adminId, role } = req.user!;

  if (role === "editor") {
    return res.status(403).json({ message: "Editors cannot access user list" });
  }

  if (role === "superadmin") {
    const all = await adminRepo.find({
      relations: ["createdBy"],
      order: { role: "ASC" },
    });
    return res.json(all);
  }

  if (role === "admin") {
    const editors = await adminRepo.find({
      where: { createdBy: { id: adminId }, role: "editor" },
    });
    return res.json(editors);
  }
};

// 🔐 POST /auth/login — логін адміна
export const loginAdmin = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const adminRepository = AppDataSource.getRepository(Admin);
  const admin = await adminRepository.findOneBy({ username });

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (admin.role === "admin" && admin.isBlocked) {
    return res.status(403).json({ message: "Account is blocked" });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ adminId: admin.id, role: admin.role }, JWT_SECRET, {
    expiresIn: "48h",
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
    expiresIn: "48h",
  });

  res.status(201).json({ token });
};

// 🔒 PUT /auth/block/:username
export const blockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOneBy({ username });

  if (!target || target.role !== "admin") {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = true;
  await adminRepo.save(target);
  res.json({ message: `Admin ${username} blocked` });
};

// 🔓 PUT /auth/unblock/:username
export const unblockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOneBy({ username });

  if (!target || target.role !== "admin") {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = false;
  await adminRepo.save(target);
  res.json({ message: `Admin ${username} unblocked` });
};

// ❌ DELETE /auth/delete/:username — superadmin може видалити будь-кого, admin — себе або своїх editor'ів
export const deleteAdminOrEditor = async (req: AuthRequest, res: Response) => {
  const requesterId = req.user!.adminId;
  const requesterRole = req.user!.role;
  const usernameToDelete = req.params.username;

  const adminRepo = AppDataSource.getRepository(Admin);
  const targetUser = await adminRepo.findOne({
    where: { username: usernameToDelete },
    relations: ["createdBy"],
  });

  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (requesterRole === "superadmin") {
    // superadmin може видалити будь-кого
    await adminRepo.remove(targetUser);
    return res.json({ message: "User deleted by superadmin" });
  }

  if (requesterRole === "editor") {
    return res.status(403).json({ message: "Editors cannot delete accounts" });
  }

  // admin може видалити себе або editor'а, якого створив
  const isSelf = targetUser.id === requesterId;
  const isCreatedByHim = targetUser.createdBy?.id === requesterId;

  if (!isSelf && !isCreatedByHim) {
    return res.status(403).json({ message: "Access denied" });
  }

  await adminRepo.remove(targetUser);
  res.json({ message: "User deleted successfully" });
};
