// src/auth/roles.ts
// Константи ролей у одному місці, щоб не розповзались "магічні" строки по коду
export const ROLES = {
  SUPER: "superadmin",
  ADMIN: "admin",
  EDITOR: "editor",
} as const;

// Тип-обʼєднання з ключів ROLES
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Хелпери (не обовʼязково, але інколи зручно)
export const isSuperAdmin = (role: Role): boolean => role === ROLES.SUPER;
export const isAdmin = (role: Role): boolean => role === ROLES.ADMIN;
