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
      // Детальная структура адреса
      street: "N/A",
      buildingNumber: null,
      apartmentNumber: null,
      country: "IT",
      province: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      full_name: "System Superadmin",
      email: "itv.dmitriiev0712@gmail.com",
      phoneCountryCode: "+39",
      phoneNumber: "3517805665",
    });
    await adminRepo.save(superadmin);
    console.log("✅ Superadmin created.");
  } else {
    // апдейтимо, якщо треба (ідемпотентність)
    superadmin.password = hashed;
    superadmin.isBlocked = false;
    superadmin.hotel_name = superadmin.hotel_name ?? "Platform Superadmin";
    // Обновляем детальную структуру адреса
    superadmin.street = superadmin.street ?? "N/A";
    superadmin.buildingNumber = superadmin.buildingNumber ?? null;
    superadmin.apartmentNumber = superadmin.apartmentNumber ?? null;
    superadmin.country = superadmin.country ?? "IT";
    superadmin.province = superadmin.province ?? null;
    superadmin.postalCode = superadmin.postalCode ?? null;
    superadmin.latitude = superadmin.latitude ?? null;
    superadmin.longitude = superadmin.longitude ?? null;
    superadmin.full_name = superadmin.full_name ?? "System Superadmin";
    superadmin.email = superadmin.email ?? "itv.dmitriiev0712@gmail.com";
    superadmin.phoneCountryCode = superadmin.phoneCountryCode ?? "+39";
    superadmin.phoneNumber = superadmin.phoneNumber ?? "3517805665";
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
