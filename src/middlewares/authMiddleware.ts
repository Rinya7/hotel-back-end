//// src/middlewares/authMiddleware.ts
//import { ROLES, Role } from "./../auth/roles";
//import { Request, Response, NextFunction } from "express";
//import jwt from "jsonwebtoken";

//export interface JwtUser {
//  adminId: number;
//  role: Role;
//  sub: number; // ← ти це поле вже використовуєш у контролерах
//}
//export interface AuthRequest extends Request {
//  user?: JwtUser;
//}

//const JWT_SECRET = process.env.JWT_SECRET as string;

//export const authenticateToken = (
//  req: AuthRequest,
//  res: Response,
//  next: NextFunction
//) => {
//  const authHeader = req.headers.authorization;
//  const token = authHeader && authHeader.split(" ")[1];

//  if (!token) {
//    return res.status(401).json({ message: "No token provided" });
//  }

//  jwt.verify(token, JWT_SECRET, (err, decoded) => {
//    if (err || !decoded)
//      return res.status(403).json({ message: "Invalid token" });
//    req.user = decoded as JwtUser;
//    next();
//  });
//};
//export const isSuperadmin = (
//  req: AuthRequest,
//  res: Response,
//  next: NextFunction
//) => {
//  if (req.user.role !== ROLES.SUPER) {
//    return res.status(403).json({ message: "Superadmin only" });
//  }
//  next();
//};
//export const isAdmin = (
//  req: AuthRequest,
//  res: Response,
//  next: NextFunction
//) => {
//  if (req.user?.role !== "admin") {
//    return res.status(403).json({ message: "Only admin allowed" });
//  }
//  next();
//};

//export const isEditorOrAdmin = (
//  req: AuthRequest,
//  res: Response,
//  next: NextFunction
//) => {
//  if (req.user?.role !== "admin" && req.user?.role !== "editor") {
//    return res.status(403).json({ message: "Access denied" });
//  }
//  next();
//};
// src/middlewares/authMiddleware.ts
import { ROLES, Role } from "../auth/roles";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

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
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return res.status(401).json({ message: "No token provided" });
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Only admin allowed" });
  }
  next();
};

/** Дозволено admin або editor */
export const isEditorOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) return res.status(401).json({ message: "No token provided" });
  if (!(req.user.role === ROLES.ADMIN || req.user.role === ROLES.EDITOR)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
