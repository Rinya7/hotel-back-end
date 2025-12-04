// src/config/openapi-validator.ts
import path from "node:path";
import { Express } from "express";
import { middleware as openApiValidator } from "express-openapi-validator";

export function setupOpenApiValidator(app: Express): void {
  // ✅ передаємо РЯДОК — шлях до зібраного файлу
  const apiSpecPath = path.resolve(process.cwd(), "openapi", "openapi.yaml");

  // Список путей, які треба ігнорувати (не перевіряти валидатором)
  const ignorePathsList = [
    "/docs",
    "/docs.json",
    "/health"
  ];

  app.use(
    openApiValidator({
      apiSpec: apiSpecPath, // <-- рядок, не об'єкт
      validateRequests: {
        allowUnknownQueryParameters: true, // Дозволяємо невідомі query параметри
        removeAdditional: false, // НЕ видаляємо додаткові поля (тимчасово для дебагу)
      },
      validateResponses: false, // вмикай true, коли схеми будуть вирівняні
      ignorePaths: (path: string) => {
        // Перевіряємо, чи шлях починається з одного з ігнорованих
        return ignorePathsList.some((ignoredPath) => path.startsWith(ignoredPath));
      },
    })
  );
}
