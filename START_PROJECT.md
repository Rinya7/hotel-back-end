{
"scripts": {
"start": "ts-node src/index.ts",
"dev": "ts-node-dev --respawn --transpile-only src/index.ts",

    "db:gen:init": "typeorm-ts-node-commonjs migration:generate src/migrations/init_schema -d src/config/data-source.ts",
    "db:migrate": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
    "db:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts",

    "seed:superadmin": "ts-node src/seeds/seedSuperadmin.ts",

    "db:setup": "npm run db:migrate && npm run seed:superadmin",
    "db:reset": "typeorm-ts-node-commonjs schema:drop -d src/config/data-source.ts && npm run db:setup"

}
}

## Розгортання з нуля

1. Підняти Postgres (Docker)
   docker run --name hotel-db \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=hotel \
    -p 5432:5432 -d postgres

2. Налаштувати .env
   DB*HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=mysecretpassword
   DB_NAME=hotel
   SUPERADMIN_USERNAME=superadmin
   SUPERADMIN_PASSWORD=<твій*пароль>
   JWT*SECRET=<будь-який*секрет>

3. (ЛИШЕ ОДИН РАЗ, коли ще нема первинної міграції)
   npm run db:gen:init # згенерує src/migrations/<ts>-init_schema.ts

   # закоміть файл міграції

4. КОЖЕН РАЗ, коли БД порожня/нова
   npm run db:setup # застосує міграції + створить/оновить супер-адміна

5. Логін
   POST /auth/login
   { "username": "superadmin", "password": "<SUPERADMIN_PASSWORD>" }

Далі superadmin → /auth/create-admin (створює готелі), а admin → /auth/create-editor (створює редакторів).

### Часті помилки

- password authentication failed → перевір .env vs POSTGRES_USER/POSTGRES_PASSWORD.
- relation "admin" does not exist → не застосовані міграції → npm run db:migrate (або npm run db:setup).
- No migrations are pending у порожній БД → спочатку згенеруй першу міграцію: npm run db:gen:init.

### Корисні alias

- Повний ресет схеми + сіди: npm run db:reset
