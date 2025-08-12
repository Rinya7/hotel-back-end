// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/authMiddleware";
import { copyHotelDataFromAdmin } from "../utils/copyHotelDataFromAdmin";

const JWT_SECRET = process.env.JWT_SECRET as string;

// 🔐 POST /auth/create-admin — тільки для superadmin
export const createAdminBySuperadmin = async (
  req: AuthRequest,
  res: Response
) => {
  const {
    username,
    password,
    confirmPassword,
    hotel_name,
    address,
    full_name,
    phone,
    email,
  } = req.body;

  if (!username || !password || !confirmPassword || !hotel_name || !address) {
    return res.status(400).json({
      message:
        "username, password, confirmPassword, hotel_name and address are required",
    });
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
    hotel_name,
    address,
    full_name,
    phone,
    email,
  });

  const saved = await adminRepo.save(newAdmin);

  res.status(201).json({
    message: `Admin "${saved.username}" created successfully`,
    adminId: saved.id,
  });
};

// 🔐 GET /auth/users — superadmin бачив усіх admin + їх editor'ів або admin бачив лише своїх editor'ів
// 🔐 GET /auth/users — superadmin: тільки адміни + їх editors; admin: лише свої editors
export const getUsers = async (req: AuthRequest, res: Response) => {
  const adminRepo = AppDataSource.getRepository(Admin);
  const { adminId, role } = req.user!;

  // редактор не має доступу
  if (role === "editor") {
    return res.status(403).json({ message: "Editors cannot access user list" });
  }

  // superadmin → тільки адміни (без editor), але з вкладеними editor’ами
  if (role === "superadmin") {
    const admins = await adminRepo.find({
      where: { role: "admin" },
      relations: ["createdEditorAdmins"],
      order: { username: "ASC" },
    });

    // Приберемо password і повернемо editors вкладено
    const data = admins.map((a) => ({
      id: a.id,
      username: a.username,
      role: a.role,
      hotel_name: a.hotel_name,
      address: a.address,
      full_name: a.full_name,
      logo_url: a.logo_url,
      phone: a.phone,
      email: a.email,
      isBlocked: a.isBlocked,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      editorsCount: a.createdEditorAdmins?.length ?? 0,
      editors: (a.createdEditorAdmins || []).map((e) => ({
        id: e.id,
        username: e.username,
        role: e.role, // завжди "editor"
        full_name: e.full_name,
        phone: e.phone,
        email: e.email,
        isBlocked: e.isBlocked,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        // Нічого зайвого (без password, без createdBy)
      })),
    }));

    return res.json(data);
  }

  // admin → як і було: тільки свої редактори плоским списком (або хочеш — можу зробити з блоком self + editors)
  if (role === "admin") {
    const editors = await adminRepo.find({
      where: { createdBy: { id: adminId }, role: "editor" },
      order: { username: "ASC" },
    });

    // Прибрати password
    const data = editors.map((e) => ({
      id: e.id,
      username: e.username,
      role: e.role, // "editor"
      full_name: e.full_name,
      phone: e.phone,
      email: e.email,
      isBlocked: e.isBlocked,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return res.json(data);
  }
};

// 🔐 POST /auth/login — логін адміна
export const loginAdmin = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const adminRepository = AppDataSource.getRepository(Admin);
  const admin = await adminRepository.findOne({
    where: { username },
    relations: ["createdBy"],
  });

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (admin.role === "admin" && admin.isBlocked) {
    return res.status(403).json({ message: "Account is blocked" });
  }
  if (admin.role === "editor" && admin.createdBy?.isBlocked) {
    return res
      .status(403)
      .json({ message: "Admin is blocked — editor access denied" });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // 👇 КЛЮЧЕВОЕ: для editor кладём adminId = id владельца отеля (createdBy.id)
  const ownerAdminId = admin.role === "editor" ? admin.createdBy!.id : admin.id;

  const token = jwt.sign(
    {
      adminId: ownerAdminId, // используется контроллерами rooms/stays
      role: admin.role, // 'superadmin' | 'admin' | 'editor'
      sub: admin.id, // фактический пользователь (кто залогинился)
    },
    JWT_SECRET,
    { expiresIn: "48h" }
  );

  res.json({ token });
};

// 🔐 POST /auth/create-editor — створення редактора
export const createEditorAdmin = async (req: AuthRequest, res: Response) => {
  const { username, password, confirmPassword, full_name, phone, email } =
    req.body;
  const creatorId = req.user!.adminId;

  // только admin может создавать редакторов
  if (req.user!.role !== "admin") {
    return res.status(403).json({ message: "Only admin can create editors" });
  }

  if (!username || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "username, password and confirmPassword are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);

  // 🔹 Получаем данные админа, который создаёт editor
  const creatorAdmin = await adminRepo.findOneBy({ id: creatorId });

  if (!creatorAdmin) {
    return res.status(404).json({ message: "Creator admin not found" });
  }
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Используем helper для копирования данных отеля
  const hotelData = copyHotelDataFromAdmin(creatorAdmin);

  // Создаём нового редактора с данными отеля и создателя
  const newEditor = adminRepo.create({
    username,
    password: hashedPassword,
    role: "editor",
    createdBy: { id: creatorId } as any,
    full_name,
    phone,
    email,
    ...hotelData,
  });

  const saved = await adminRepo.save(newEditor);

  // 👇 ВАЖНО: adminId = creatorId (власник готелю), sub = id редактора
  const token = jwt.sign(
    { adminId: creatorId, role: saved.role, sub: saved.id },
    JWT_SECRET,
    { expiresIn: "48h" }
  );

  res.status(201).json({
    message: `Editor "${saved.username}" created successfully`,
    token,
  });
};

// 🔒 PUT /auth/block/:username
export const blockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== "admin") {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = true;
  // 👉 Автоматично блочимо всіх editor'ів, яких він створив
  for (const editor of target.createdEditorAdmins) {
    editor.isBlocked = true;
  }
  await adminRepo.save([target, ...target.createdEditorAdmins]);
  res.json({ message: `Admin ${username} and all editors blocked` });
};

// 🔓 PUT /auth/unblock/:username
export const unblockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== "admin") {
    return res.status(404).json({ message: "Admin not found" });
  }

  target.isBlocked = false;
  // 👉 Розблоковуємо всіх editor'ів
  for (const editor of target.createdEditorAdmins) {
    editor.isBlocked = false;
  }

  await adminRepo.save([target, ...target.createdEditorAdmins]);

  res.json({ message: `Admin ${username} and all editors unblocked` });
};

// ❌ DELETE /auth/delete/:username — superadmin може видалити будь-кого, admin — себе або своїх editor'ів
export const deleteAdminOrEditor = async (req: AuthRequest, res: Response) => {
  const requesterId = req.user!.sub; // фактически вошедший
  const ownerId = req.user!.adminId; // владелец отеля
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
    return res.json({
      message: `User "${usernameToDelete}" deleted by superadmin`,
    });
  }

  if (requesterRole === "editor") {
    return res.status(403).json({ message: "Editors cannot delete accounts" });
  }

  // admin не может удалить самого себя
  if (targetUser.id === requesterId) {
    return res.status(403).json({ message: "Admin cannot delete own account" });
  }

  // admin может удалить только своего editor'а
  const isCreatedByHim = targetUser.createdBy?.id === ownerId;
  if (!isCreatedByHim) {
    return res.status(403).json({ message: "Access denied" });
  }

  await adminRepo.remove(targetUser);
  res.json({ message: `User "${usernameToDelete}" deleted successfully` });
};
