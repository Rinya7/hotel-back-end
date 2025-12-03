# ============================================ 
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Спочатку копіюємо тільки package*.json, щоб кешувати node_modules
COPY package*.json ./
RUN npm ci

# Копіюємо весь код
COPY . .

# Білдимо TypeScript + OpenAPI
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Створюємо непривілейованого користувача
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копіюємо package.json + package-lock.json
COPY package*.json ./

# Ставимо тільки production-залежності
RUN npm ci --only=production && npm cache clean --force

# Копіюємо скомпільований JS-код і OpenAPI
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi ./openapi

# Даємо права користувачу nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Production режим
ENV NODE_ENV=production

# Healthcheck — стукає в /health
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Запуск бекенду
CMD ["node", "dist/index.js"]
