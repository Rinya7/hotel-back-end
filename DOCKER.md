# Docker Deployment Guide

Документація по розгортанню Hotel Backend API з використанням Docker.

## 📋 Вимоги

- Docker 20.10+
- Docker Compose 2.0+ (опціонально)

## 🚀 Швидкий старт

### 1. З використанням Docker Compose (рекомендовано)

```bash
# Клонувати репозиторій
git clone <repository-url>
cd hotel-backend

# Створити .env файл (скопіювати з .env.example або налаштувати вручну)
cp .env.example .env
# Відредагувати .env файл з необхідними параметрами

# Запустити сервіси
docker-compose up -d

# Перевірити логи
docker-compose logs -f backend

# Зупинити сервіси
docker-compose down
```

### 2. З використанням Dockerfile

```bash
# Збудувати образ
docker build -t hotel-backend:latest .

# Запустити контейнер (потребує окремо запущеної PostgreSQL)
docker run -d \
  --name hotel-backend \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=mysecretpassword \
  -e DB_NAME=hotel \
  -e JWT_SECRET=your-secret-key \
  hotel-backend:latest
```

## 🔧 Налаштування змінних середовища

Створіть файл `.env` в корені проекту:

```env
# База даних
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=mysecretpassword
DB_NAME=hotel

# JWT
JWT_SECRET=your-super-secret-key-here

# Супер-адмін
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your-superadmin-password

# Опціональні параметри
PORT=3000
NODE_ENV=production
RUN_MIGRATIONS=true
START_SCHEDULER=true

# URL конфігурація
BASE_URL=https://hotel-lotse.app
GUEST_APP_BASE_URL=https://guest.hotel-lotse.app
```

## 📦 Структура Docker образа

Dockerfile використовує **multi-stage build** для оптимізації розміру:

1. **Stage 1 (builder)**: Компіляція TypeScript, збірка OpenAPI документації
2. **Stage 2 (production)**: Мінімальний production образ з тільки необхідними залежностями

### Переваги:

- ✅ Менший розмір фінального образу
- ✅ Безпека (використання непривілейованого користувача)
- ✅ Healthcheck для моніторингу
- ✅ Кешування шарів для швидшої збірки

## 🏥 Health Check

Dockerfile включає healthcheck endpoint:

```bash
# Перевірка статусу контейнера
docker ps

# Перевірка healthcheck вручну
curl http://localhost:3000/health
```

Healthcheck автоматично перевіряє доступність додатку кожні 30 секунд.

## 🗄️ База даних

### Використання з docker-compose

PostgreSQL автоматично запускається разом з backend:

```bash
# Запустити тільки базу даних
docker-compose up -d postgres

# Перевірити статус
docker-compose ps

# Підключитися до бази даних
docker-compose exec postgres psql -U postgres -d hotel
```

### Використання зовнішньої бази даних

Якщо PostgreSQL запущена окремо:

```bash
docker run -d \
  --name hotel-backend \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=your-username \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=hotel \
  hotel-backend:latest
```

## 🔄 Міграції бази даних

Міграції запускаються автоматично при старті контейнера (якщо `RUN_MIGRATIONS=true`).

Для ручного запуску міграцій:

```bash
# Запустити міграції в контейнері
docker-compose exec backend npm run db:migrate

# Або після збірки образу
docker run --rm \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  hotel-backend:latest \
  npm run db:migrate
```

## 🛠 Команди для розробки

```bash
# Перебудувати образ
docker-compose build --no-cache

# Переглянути логи
docker-compose logs -f backend

# Переглянути логи тільки помилки
docker-compose logs -f backend | grep ERROR

# Зупинити та видалити контейнери
docker-compose down

# Зупинити та видалити контейнери з volumes
docker-compose down -v

# Виконати команду в контейнері
docker-compose exec backend sh

# Перезапустити сервіс
docker-compose restart backend
```

## 📊 Моніторинг

### Перевірка використання ресурсів

```bash
# Статистика контейнерів
docker stats

# Детальна інформація про контейнер
docker inspect hotel-backend
```

### Логи

```bash
# Логи backend
docker-compose logs backend

# Логи з follow режимом
docker-compose logs -f backend

# Останні 100 рядків логів
docker-compose logs --tail=100 backend
```

## 🔐 Безпека

### Рекомендації:

1. **Не коммітити `.env` файл** - він вже в `.gitignore`
2. **Використовувати сильні паролі** для бази даних та JWT_SECRET
3. **Оновлювати залежності** регулярно
4. **Використовувати secrets** в production (Docker Secrets, Kubernetes Secrets)

### Production Checklist:

- [ ] Змінити всі дефолтні паролі
- [ ] Налаштувати SSL/TLS (через Nginx reverse proxy)
- [ ] Налаштувати брандмауер
- [ ] Регулярно оновлювати образи
- [ ] Налаштувати backup бази даних
- [ ] Використовувати Docker secrets для конфіденційних даних

## 🚀 Production Deployment

### З Nginx Reverse Proxy

```nginx
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name hotel-lotse.app;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### З Docker Compose в production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: .
    restart: always
    environment:
      NODE_ENV: production
    networks:
      - app-network
```

## 🐛 Troubleshooting

### Контейнер не запускається

```bash
# Перевірити логи
docker-compose logs backend

# Перевірити конфігурацію
docker-compose config
```

### Проблеми з підключенням до бази даних

```bash
# Перевірити, чи запущена PostgreSQL
docker-compose ps postgres

# Перевірити з'єднання
docker-compose exec backend ping postgres
```

### Міграції не виконуються

```bash
# Запустити міграції вручну
docker-compose exec backend npm run db:migrate

# Перевірити логи міграцій
docker-compose logs backend | grep migration
```

## 📚 Додаткова інформація

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

