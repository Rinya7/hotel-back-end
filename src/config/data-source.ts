// src/config/data-source.ts
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

// Перевірка обовʼязкових ENV (мінімум)
["DB_HOST", "DB_PORT", "DB_USERNAME", "DB_PASSWORD", "DB_NAME"].forEach((k) => {
  if (!process.env[k]) {
    throw new Error(`Missing required env var: ${k}`);
  }
});

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // У проді завжди через міграції
  synchronize: false,

  // Логування бажано лише в dev
  logging: !isProd,

  // Підтримай і ts (ts-node) і скомпільований js (dist)
  entities: [path.join(__dirname, "..", "entities", "**", `*.{ts,js}`)],
  migrations: [path.join(__dirname, "..", "migrations", `*.{ts,js}`)],

  // Опції пулу + SSL у проді
  extra: {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT ?? 30000),
    ...(isProd && process.env.DB_SSL === "1"
      ? {
          ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTH !== "0" },
        }
      : {}),
  },

  // (опційно) назва таблиці для історії міграцій
  migrationsTableName: "typeorm_migrations",
});
