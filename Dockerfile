# ============================================ 
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Копіюємо package.json та package-lock.json (незалежний проект)
COPY package.json package-lock.json ./

# Встановлюємо всі залежності
RUN npm ci

# Копіюємо весь код
COPY . .

# Збираємо проект
RUN npm run build


# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Створюємо непривілейованого користувача
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копіюємо package.json та package-lock.json (незалежний проект)
COPY package.json package-lock.json ./

# Встановлюємо тільки production-залежності
RUN npm ci --omit=dev && npm cache clean --force

# Копіюємо скомпільовані файли
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi ./openapi

# Права
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
