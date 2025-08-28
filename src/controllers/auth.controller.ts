// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/authMiddleware";
import { copyHotelDataFromAdmin } from "../utils/copyHotelDataFromAdmin";
import type { LoginRequestDto, LoginResponseDto } from "../dto/auth.dto";
import { ROLES, Role } from "../auth/roles";
import { isHour, isHourOptional } from "../utils/hours";

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * 🔐 POST /auth/create-admin — superadmin only
 * Body:
 *  - username, password, confirmPassword, hotel_name, address, ...
 *  - checkInHour?: number(0..23)
 *  - checkOutHour?: number(0..23)
 */
export const createAdminBySuperadmin = async (
  req: AuthRequest,
  res: Response
) => {
  // ❗ Safety check: even if route is protected by middleware, double-check role here.
  if (!req.user || req.user.role !== ROLES.SUPER) {
    return res.status(403).json({ message: "Superadmin only" });
  }
  const {
    username,
    password,
    confirmPassword,
    hotel_name,
    address,
    full_name,
    phone,
    email,
    checkInHour,
    checkOutHour,
  } = req.body as {
    username: string;
    password: string;
    confirmPassword: string;
    hotel_name: string;
    address: string;
    full_name?: string;
    phone?: string;
    email?: string;
    checkInHour?: number;
    checkOutHour?: number;
  };

  if (!username || !password || !confirmPassword || !hotel_name || !address) {
    return res.status(400).json({
      message:
        "username, password, confirmPassword, hotel_name and address are required",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Optional policy hours validation (0..23 if provided)
  if (!isHourOptional(checkInHour) || !isHourOptional(checkOutHour)) {
    return res
      .status(400)
      .json({ message: "checkInHour/checkOutHour must be integers in 0..23" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOneBy({ username });

  if (existing) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create entity with hotel defaults.
  // If hours provided → override; else entity defaults (14/10) will be used.
  const newAdmin = adminRepo.create({
    username,
    password: hashedPassword,
    role: ROLES.ADMIN,
    isBlocked: false,
    hotel_name,
    address,
    full_name,
    phone,
    email,
    ...(typeof checkInHour !== "undefined" ? { checkInHour } : {}),
    ...(typeof checkOutHour !== "undefined" ? { checkOutHour } : {}),
  });

  const saved = await adminRepo.save(newAdmin);

  res.status(201).json({
    message: `Admin "${saved.username}" created successfully`,
    adminId: saved.id,
    policy: {
      checkInHour: saved.checkInHour,
      checkOutHour: saved.checkOutHour,
    },
  });
};

/**
 * 🔐 GET /auth/users
 * - superadmin: returns only hotel admins + nested editors
 * - admin: returns only their editors
 * - editor: forbidden
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  const adminRepo = AppDataSource.getRepository(Admin);
  const { adminId, role } = req.user!;

  // редактор не має доступу
  if (role === ROLES.EDITOR) {
    return res.status(403).json({ message: "Editors cannot access user list" });
  }

  // superadmin → тільки адміни (без editor), але з вкладеними editor’ами
  if (role === ROLES.SUPER) {
    const admins = await adminRepo.find({
      where: { role: ROLES.ADMIN },
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
      checkInHour: a.checkInHour, // 👈 show hotel policy
      checkOutHour: a.checkOutHour, // 👈 show hotel policy
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
  if (role === ROLES.ADMIN) {
    const editors = await adminRepo.find({
      where: { createdBy: { id: adminId }, role: ROLES.EDITOR },
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

/**
 * 🔐 POST /auth/login — admin or editor login
 * Payload:
 *  - For editor: adminId = owner's id (createdBy.id)
 *  - For admin:  adminId = own id
 * The same payload shape is preserved for middleware/guards.
 */
export const loginAdmin = async (req: Request, res: Response) => {
  const { username, password } = req.body as LoginRequestDto;

  // 1) Шукаємо користувача
  const adminRepository = AppDataSource.getRepository(Admin);
  // ВАЖЛИВО: тягнемо createdBy, бо для editor потрібен власник готелю
  const admin = await adminRepository.findOne({
    where: { username },
    relations: ["createdBy"],
  });

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (admin.role === ROLES.ADMIN && admin.isBlocked) {
    return res.status(403).json({ message: "Account is blocked" });
  }
  if (admin.role === ROLES.EDITOR && admin.createdBy?.isBlocked) {
    return res
      .status(403)
      .json({ message: "Admin is blocked — editor access denied" });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // 👇 КЛЮЧЕВОЕ: для editor кладём adminId = id владельца отеля (createdBy.id)
  const ownerAdminId =
    admin.role === ROLES.EDITOR ? admin.createdBy!.id : admin.id;

  // ✅ Токен НЕ міняємо — payload залишається тим самим, щоб middleware/контролери працювали як зараз
  // adminId = id власника готелю (для editor — це його createdBy)
  const token = jwt.sign(
    {
      adminId: ownerAdminId, // используется контроллерами rooms/stays
      role: admin.role as Role, // 'superadmin' | 'admin' | 'editor'
      sub: admin.id, // фактический пользователь (кто залогинился)
    },
    JWT_SECRET,
    { expiresIn: "48h" }
  );
  // 🆕 Відповідь: віддаємо профіль для фронта
  const policy =
    admin.role === "admin"
      ? { checkInHour: admin.checkInHour, checkOutHour: admin.checkOutHour }
      : admin.createdBy
      ? {
          checkInHour: admin.createdBy.checkInHour,
          checkOutHour: admin.createdBy.checkOutHour,
        }
      : undefined;

  const payload: LoginResponseDto = {
    token,
    username: admin.username,
    role: admin.role as Role,
    adminId: ownerAdminId,
    // Для admin — беремо своє hotel_name; для editor — hotel_name власника
    hotelName:
      admin.role === ROLES.ADMIN
        ? admin.hotel_name ?? undefined
        : admin.createdBy?.hotel_name ?? undefined,

    // 👇 при желании можно сразу отдать и часы дефолтов отеля:
    ...(policy ? { policy } : {}),
  };
  return res.json({ payload });
};

/**
 * 🔐 POST /auth/create-editor — only admin can create editors
 * Copies hotel profile (including policy hours) from owner admin.
 */
export const createEditorAdmin = async (req: AuthRequest, res: Response) => {
  const { username, password, confirmPassword, full_name, phone, email } =
    req.body as {
      username: string;
      password: string;
      confirmPassword: string;
      full_name?: string;
      phone?: string;
      email?: string;
    };
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
  // Copy hotel profile + policy hours from owner
  const hotelData = copyHotelDataFromAdmin(creatorAdmin);

  // Создаём нового редактора с данными отеля и создателя
  const newEditor = adminRepo.create({
    username,
    password: hashedPassword,
    role: ROLES.EDITOR,
    createdBy: creatorAdmin,
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

/**
 * 🔒 PUT /auth/block/:username — block admin and all their editors
 */
export const blockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== ROLES.ADMIN) {
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

/**
 * 🔓 PUT /auth/unblock/:username — unblock admin and all their editors
 */
export const unblockAdmin = async (req: AuthRequest, res: Response) => {
  const username = req.params.username;
  const adminRepo = AppDataSource.getRepository(Admin);
  const target = await adminRepo.findOne({
    where: { username },
    relations: ["createdEditorAdmins"],
  });

  if (!target || target.role !== ROLES.ADMIN) {
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

/**
 * ❌ DELETE /auth/delete/:username
 * - superadmin can delete anyone
 * - admin can delete their editors (not themselves)
 * - editor cannot delete
 */
export const deleteAdminOrEditor = async (req: AuthRequest, res: Response) => {
  const requesterId = req.user!.sub; // actual logged-in user id
  const ownerId = req.user!.adminId; // hotel owner id
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

  if (requesterRole === ROLES.SUPER) {
    // superadmin може видалити будь-кого
    await adminRepo.remove(targetUser);
    return res.json({
      message: `User "${usernameToDelete}" deleted by superadmin`,
    });
  }

  if (requesterRole === ROLES.EDITOR) {
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
