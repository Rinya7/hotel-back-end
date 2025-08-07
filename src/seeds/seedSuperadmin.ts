//акуратний скрипт seedSuperadmin.ts із підтримкою .env для пароля супер-адміністратора

import "dotenv/config";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";

const seedSuperadmin = async () => {
  try {
    await AppDataSource.initialize();
    const adminRepo = AppDataSource.getRepository(Admin);

    const existing = await adminRepo.findOneBy({ role: "superadmin" });
    if (existing) {
      console.log("⚠️ Superadmin already exists.");
      return;
    }

    const password = process.env.SUPERADMIN_PASSWORD;
    if (!password) {
      console.error("❌ SUPERADMIN_PASSWORD not set in .env");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 10);

    const superadmin = adminRepo.create({
      username: "superadmin",
      password: hashed,
      role: "superadmin",
      isBlocked: false,
    });

    await adminRepo.save(superadmin);
    console.log("✅ Superadmin created successfully.");
  } catch (error) {
    console.error("❌ Error seeding superadmin:", error);
  } finally {
    await AppDataSource.destroy();
  }
};

seedSuperadmin();
