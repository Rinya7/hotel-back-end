// src/config/openapi-validator.ts
import path from "node:path";
import { Express } from "express";
import { middleware as openApiValidator } from "express-openapi-validator";

export function setupOpenApiValidator(app: Express): void {
  // ✅ передаємо РЯДОК — шлях до зібраного файлу
  const apiSpecPath = path.resolve(process.cwd(), "openapi", "openapi.yaml");

  app.use(
    openApiValidator({
      apiSpec: apiSpecPath, // <-- рядок, не об’єкт
      validateRequests: true,
      validateResponses: false, // вмикай true, коли схеми будуть вирівняні
      ignorePaths: /\/docs(\.json)?|\/docs\/?.*/,
    })
  );
}
