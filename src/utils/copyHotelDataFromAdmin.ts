// src/utils/copyHotelDataFromAdmin.ts
// Purpose: copy visible hotel profile fields from the owner admin to another admin (editor).
import { Admin } from "../entities/Admin";
import { policyHoursFor } from "./policy";

export function copyHotelDataFromAdmin(owner: Admin): {
  hotel_name?: string;
  // Детальная структура адреса
  street?: string | null;
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  country?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  logo_url?: string;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  email?: string;
  checkInHour: number;
  checkOutHour: number;
} {
  const { inHour, outHour } = policyHoursFor({ admin: owner } as any);
  return {
    hotel_name: owner.hotel_name ?? undefined,
    // Копируем детальную структуру адреса
    street: owner.street ?? null,
    buildingNumber: owner.buildingNumber ?? null,
    apartmentNumber: owner.apartmentNumber ?? null,
    country: owner.country ?? null,
    province: owner.province ?? null,
    postalCode: owner.postalCode ?? null,
    latitude: owner.latitude ?? null,
    longitude: owner.longitude ?? null,
    logo_url: owner.logo_url ?? undefined,
    phoneCountryCode: owner.phoneCountryCode ?? null,
    phoneNumber: owner.phoneNumber ?? null,
    email: owner.email ?? undefined,
    // include policy hours so editor "inherits" visible hotel policy
    checkInHour: inHour,
    checkOutHour: outHour,
  };
}
