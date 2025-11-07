// src/test-geocoding.ts
// Тестовый скрипт для проверки работы Google Geocoding API
import "dotenv/config";
import { geocodeAddress, buildFullAddress } from "./services/geocoding.service";

async function testGeocoding() {
  console.log("🧪 Тестирование Google Geocoding API...\n");

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("❌ GOOGLE_MAPS_API_KEY не найден в .env файле!");
    console.log("💡 Добавьте GOOGLE_MAPS_API_KEY=your_key в файл .env");
    process.exit(1);
  }

  console.log("✅ API ключ найден:", apiKey.substring(0, 10) + "...\n");

  // Тестовые адреса
  const testAddresses = [
    {
      name: "Тест 1: Полный адрес в Италии",
      components: {
        street: "Via Roma",
        buildingNumber: "123",
        province: "RM", // Рим
        postalCode: "00100",
        country: "IT",
      },
    },
    {
      name: "Тест 2: Адрес в Украине",
      components: {
        street: "Хрещатик",
        buildingNumber: "1",
        province: "Київ",
        postalCode: "01001",
        country: "UA",
      },
    },
    {
      name: "Тест 3: Простой адрес",
      components: {
        street: "Main Street",
        buildingNumber: "42",
        country: "IT",
      },
    },
  ];

  for (const test of testAddresses) {
    console.log(`📋 ${test.name}`);
    const fullAddress = buildFullAddress(test.components);
    console.log(`   Адрес: ${fullAddress}`);

    try {
      const result = await geocodeAddress(fullAddress);
      if (result) {
        console.log(`   ✅ Координаты получены:`);
        console.log(`      Широта: ${result.latitude}`);
        console.log(`      Долгота: ${result.longitude}`);
      } else {
        console.log(`   ⚠️ Координаты не получены (возможно, адрес не найден)`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка:`, error instanceof Error ? error.message : error);
    }
    console.log("");
  }

  console.log("✅ Тестирование завершено!");
}

testGeocoding().catch((error) => {
  console.error("❌ Критическая ошибка:", error);
  process.exit(1);
});

