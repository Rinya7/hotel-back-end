// src/scripts/seedSuperadmin.ts
import "dotenv/config";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data-source";
import { Admin } from "../entities/Admin";

async function seedSuperadmin() {
  await AppDataSource.initialize();

  // ✅ гарантуємо, що всі колонки/enum/FK існують
  await AppDataSource.runMigrations();

  const adminRepo = AppDataSource.getRepository(Admin);

  // шукаємо або за role, або за username — як зручніше
  let superadmin = await adminRepo.findOne({
    where: [{ role: "superadmin" as const }, { username: "superadmin" }],
  });

  const password = process.env.SUPERADMIN_PASSWORD;
  if (!password) {
    console.error("❌ SUPERADMIN_PASSWORD not set in .env");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  if (!superadmin) {
    superadmin = adminRepo.create({
      username: "superadmin",
      password: hashed,
      role: "superadmin",
      isBlocked: false,
      // базові поля, щоб нічого не падало
      hotel_name: "Platform Superadmin",
      address: "N/A",
      full_name: "System Superadmin",
      email: "itv.dmitriiev0712@gmail.com",
      phone: "+39-351-780-56-65",
    });
    await adminRepo.save(superadmin);
    console.log("✅ Superadmin created.");
  } else {
    // апдейтимо, якщо треба (ідемпотентність)
    superadmin.password = hashed;
    superadmin.isBlocked = false;
    superadmin.hotel_name = superadmin.hotel_name ?? "Platform Superadmin";
    superadmin.address = superadmin.address ?? "N/A";
    superadmin.full_name = superadmin.full_name ?? "System Superadmin";
    superadmin.email = superadmin.email ?? "itv.dmitriiev0712@gmail.com";
    await adminRepo.save(superadmin);
    console.log("ℹ️ Superadmin already existed — updated.");
  }

  await AppDataSource.destroy();
}

seedSuperadmin().catch(async (e) => {
  console.error("❌ Error seeding superadmin:", e);
  try {
    await AppDataSource.destroy();
  } catch {}
  process.exit(1);
});
