// src/constants/countries.ts
// Список стран Европы для выбора в формах

export interface Country {
  code: string; // ISO 3166-1 alpha-2 код
  name: string; // Название страны
  phoneCode: string; // Телефонный код (например, +39, +380)
}

export const EUROPEAN_COUNTRIES: Country[] = [
  { code: "IT", name: "Италия / Italy", phoneCode: "+39" },
  { code: "UA", name: "Украина / Ukraine", phoneCode: "+380" },
  { code: "PL", name: "Польша / Poland", phoneCode: "+48" },
  { code: "DE", name: "Германия / Germany", phoneCode: "+49" },
  { code: "FR", name: "Франция / France", phoneCode: "+33" },
  { code: "ES", name: "Испания / Spain", phoneCode: "+34" },
  { code: "GB", name: "Великобритания / United Kingdom", phoneCode: "+44" },
  { code: "AT", name: "Австрия / Austria", phoneCode: "+43" },
  { code: "BE", name: "Бельгия / Belgium", phoneCode: "+32" },
  { code: "BG", name: "Болгария / Bulgaria", phoneCode: "+359" },
  { code: "HR", name: "Хорватия / Croatia", phoneCode: "+385" },
  { code: "CY", name: "Кипр / Cyprus", phoneCode: "+357" },
  { code: "CZ", name: "Чехия / Czech Republic", phoneCode: "+420" },
  { code: "DK", name: "Дания / Denmark", phoneCode: "+45" },
  { code: "EE", name: "Эстония / Estonia", phoneCode: "+372" },
  { code: "FI", name: "Финляндия / Finland", phoneCode: "+358" },
  { code: "GR", name: "Греция / Greece", phoneCode: "+30" },
  { code: "HU", name: "Венгрия / Hungary", phoneCode: "+36" },
  { code: "IE", name: "Ирландия / Ireland", phoneCode: "+353" },
  { code: "LV", name: "Латвия / Latvia", phoneCode: "+371" },
  { code: "LT", name: "Литва / Lithuania", phoneCode: "+370" },
  { code: "LU", name: "Люксембург / Luxembourg", phoneCode: "+352" },
  { code: "MT", name: "Мальта / Malta", phoneCode: "+356" },
  { code: "NL", name: "Нидерланды / Netherlands", phoneCode: "+31" },
  { code: "PT", name: "Португалия / Portugal", phoneCode: "+351" },
  { code: "RO", name: "Румыния / Romania", phoneCode: "+40" },
  { code: "SK", name: "Словакия / Slovakia", phoneCode: "+421" },
  { code: "SI", name: "Словения / Slovenia", phoneCode: "+386" },
  { code: "SE", name: "Швеция / Sweden", phoneCode: "+46" },
  { code: "CH", name: "Швейцария / Switzerland", phoneCode: "+41" },
  { code: "NO", name: "Норвегия / Norway", phoneCode: "+47" },
  { code: "IS", name: "Исландия / Iceland", phoneCode: "+354" },
];

/**
 * Получить страну по коду
 */
export function getCountryByCode(code: string): Country | undefined {
  return EUROPEAN_COUNTRIES.find((c) => c.code === code);
}

/**
 * Получить страну по телефонному коду
 */
export function getCountryByPhoneCode(phoneCode: string): Country | undefined {
  return EUROPEAN_COUNTRIES.find((c) => c.phoneCode === phoneCode);
}

