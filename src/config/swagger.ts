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
 * - динамічно визначаємо протокол (HTTP/HTTPS) з запиту
 */
export function setupSwagger(app: Express): OpenAPIV3.Document {
  // 1) Шлях до зібраної специфікації
  const docPath = path.resolve(process.cwd(), "openapi", "openapi.yaml");

  // 2) Читаємо файл і парсимо YAML → об'єкт з чітким типом OpenAPI v3
  const file = fs.readFileSync(docPath, "utf8");
  const baseDocument = YAML.parse(file) as OpenAPIV3.Document;

  /**
   * Визначає протокол з запиту, враховуючи проксі (X-Forwarded-Proto)
   */
  const getProtocol = (req: Request): string => {
    // Перевіряємо заголовок X-Forwarded-Proto (якщо за проксі)
    const forwardedProto = req.get("x-forwarded-proto");
    if (forwardedProto) {
      return forwardedProto.split(",")[0].trim();
    }
    // Інакше використовуємо протокол з запиту
    return req.protocol;
  };

  // 3) "Сирий" JSON - динамічно оновлюємо servers на основі протоколу запиту
  app.get("/docs.json", (req: Request, res: Response) => {
    const protocol = getProtocol(req); // 'http' або 'https'
    const host = req.get("host") || "localhost:3000"; // 'localhost:3000' або '46.224.81.114:3000'
    
    // Створюємо копію документа з оновленими servers
    const document: OpenAPIV3.Document = {
      ...baseDocument,
      servers: [
        {
          url: `${protocol}://${host}`,
          description: "Current server",
        },
        ...(baseDocument.servers || []).map((server) => {
          // Замінюємо протокол у існуючих servers на протокол запиту
          const serverUrl = typeof server.url === "string" ? server.url : "";
          try {
            const url = new URL(serverUrl);
            url.protocol = protocol;
            return {
              ...server,
              url: url.toString(),
            };
          } catch {
            // Якщо URL невалідний, повертаємо як є
            return server;
          }
        }),
      ],
    };

    res.json(document);
  });

  // 4) Красивий UI - також динамічно оновлюємо servers
  app.use(
    "/docs",
    swaggerUi.serve,
    (req: Request, res: Response, next: () => void) => {
      const protocol = getProtocol(req); // 'http' або 'https'
      const host = req.get("host") || "localhost:3000"; // 'localhost:3000' або '46.224.81.114:3000'
      
      // Створюємо копію документа з оновленими servers
      const document: OpenAPIV3.Document = {
        ...baseDocument,
        servers: [
          {
            url: `${protocol}://${host}`,
            description: "Current server",
          },
          ...(baseDocument.servers || []).map((server) => {
            // Замінюємо протокол у існуючих servers на протокол запиту
            const serverUrl = typeof server.url === "string" ? server.url : "";
            try {
              const url = new URL(serverUrl);
              url.protocol = protocol;
              return {
                ...server,
                url: url.toString(),
              };
            } catch {
              // Якщо URL невалідний, повертаємо як є
              return server;
            }
          }),
        ],
      };

      // Налаштування Swagger UI з опціями для примусового використання протоколу з запиту
      const swaggerOptions: swaggerUi.SwaggerUiOptions = {
        swaggerOptions: {
          // Використовувати відносний шлях, щоб Swagger UI сам визначив протокол
          url: `/docs.json`,
          // Відключити автоматичне визначення HTTPS
          supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
          // Додаткові опції для коректної роботи
          persistAuthorization: false,
          // Відключити автоматичне перемикання на HTTPS
          validatorUrl: null,
          // Примусово використовувати протокол з документа (не перевизначати на HTTPS)
          requestInterceptor: (request: any) => {
            // Якщо запит має абсолютний URL, замінюємо протокол на протокол запиту
            if (request.url && typeof request.url === "string" && request.url.startsWith("http")) {
              try {
                const url = new URL(request.url);
                url.protocol = protocol;
                request.url = url.toString();
              } catch {
                // Якщо не вдалося парсити URL, залишаємо як є
              }
            }
            return request;
          },
          // Відключити автоматичне визначення схем (http/https)
          // Це запобігає автоматичному перемиканню на HTTPS
          deepLinking: false,
          // Відключити автоматичне визначення протоколу
          // Swagger UI буде використовувати протокол з servers в документі
          tryItOutEnabled: true,
        },
        // Додаткові опції для кастомізації UI
        customCss: `
          .swagger-ui .scheme-container {
            display: none !important;
          }
        `,
      };

      return swaggerUi.setup(document, swaggerOptions)(req, res, next);
    }
  );

  return baseDocument; // повертаємо базовий документ для валідатора
}
