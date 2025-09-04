// src/config/swagger.ts
import path from "node:path";
import fs from "node:fs";
import { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml"; // ← сучасний парсер, типобезпечний
import type { OpenAPIV3 } from "openapi-types";

/**
 * Пояснення:
 * - читаємо вже "забандлений" openapi.yaml (щоб не парсити модулі в рантаймі)
 * - віддаємо /docs.json (для інтеграцій/перевірок)
 * - монтуємо Swagger UI на /docs
 */
export function setupSwagger(app: Express): OpenAPIV3.Document {
  // 1) Шлях до зібраної специфікації
  const docPath = path.resolve(process.cwd(), "openapi", "openapi.yaml");

  // 2) Читаємо файл і парсимо YAML → об’єкт з чітким типом OpenAPI v3
  const file = fs.readFileSync(docPath, "utf8");
  const document = YAML.parse(file) as OpenAPIV3.Document;

  // 3) "Сирий" JSON
  app.get("/docs.json", (_req: Request, res: Response) => {
    res.json(document);
  });

  // 4) Красивий UI
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(document));

  return document; // повертаємо щоб використати для валідатора
}
