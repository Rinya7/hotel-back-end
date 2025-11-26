// src/middlewares/authMiddleware.ts
import { ROLES, Role } from "../auth/roles";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";

export interface JwtUser {
  adminId: number; // id власника готелю (для editor — це id admin'а)
  role: Role; // 'superadmin' | 'admin' | 'editor'
  sub: number; // фактичний користувач, який залогінився
}

export interface AuthRequest extends Request {
  user?: JwtUser;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

/** Перевіряє JWT і кладе payload у req.user (тип JwtUser) */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err || !payload || typeof payload === "string") {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Звужуємо тип, додатково перевіряємо наявність полів
    const p = payload as JwtPayload & Partial<JwtUser>;
    if (
      typeof p.adminId !== "number" ||
      typeof p.sub !== "number" ||
      typeof p.role !== "string"
    ) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    // Тепер req.user гарантовано існує і має правильний тип
    req.user = { adminId: p.adminId, role: p.role as Role, sub: p.sub };
    next();
  });
};

/** Дозволено лише супер-адміну */
export const isSuperadmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return res.status(401).json({ message: "No token provided" });
  if (req.user.role !== ROLES.SUPER) {
    return res.status(403).json({ message: "Superadmin only" });
  }
  next();
};

/** Дозволено лише головному admin (не editor, не superadmin) */
export const isAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return res.status(401).json({ message: "No token provided" });
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Only admin allowed" });
  }
  
  // Проверка блокировки админа
  await checkUserNotBlocked(req, res, next);
};

/** Дозволено admin або editor */
export const isEditorOrAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return res.status(401).json({ message: "No token provided" });
  if (!(req.user.role === ROLES.ADMIN || req.user.role === ROLES.EDITOR)) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  // Проверка блокировки админа или редактора
  await checkUserNotBlocked(req, res, next);
};

/** Перевіряє, чи не заблокований користувач (використовується після authenticateToken) */
export const checkUserNotBlocked = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "No token provided" });
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  
  try {
    // Для суперадмина не проверяем блокировку
    if (req.user.role === ROLES.SUPER) {
      return next();
    }

    // Загружаем пользователя из БД
    const user = await adminRepo.findOne({
      where: { id: req.user.sub },
      relations: ["createdBy"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Проверка блокировки админа
    if (user.role === ROLES.ADMIN && user.isBlocked) {
      return res.status(403).json({
        message: "Ваш акаунт заблоковано, зверніться до адміністратора системи",
      });
    }

    // Проверка блокировки редактора: сам редактор заблокирован ИЛИ его создатель заблокирован
    if (user.role === ROLES.EDITOR) {
      if (user.isBlocked || user.createdBy?.isBlocked) {
        return res.status(403).json({
          message: "Ваш акаунт заблоковано, зверніться до адміністратора системи",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking user block status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
