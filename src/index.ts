import app from "./app";
import { AppDataSource } from "./config/data-source";

const PORT = process.env.PORT || 3000;

// Підключення до бази + старт сервера
AppDataSource.initialize()
  .then(() => {
    console.log("📦 Connected to the database");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error connecting to the database:", error);
  });
