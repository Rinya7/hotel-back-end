// src/utils/copyHotelDataFromAdmin.ts
// Purpose: copy visible hotel profile fields from the owner admin to another admin (editor).
import { Admin } from "../entities/Admin";
import { policyHoursFor } from "./policy";

export function copyHotelDataFromAdmin(owner: Admin): {
  hotel_name?: string;
  address?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  checkInHour: number;
  checkOutHour: number;
} {
  const { inHour, outHour } = policyHoursFor({ admin: owner } as any);
  return {
    hotel_name: owner.hotel_name ?? undefined,
    address: owner.address ?? undefined,
    logo_url: owner.logo_url ?? undefined,
    phone: owner.phone ?? undefined,
    email: owner.email ?? undefined,
    // include policy hours so editor "inherits" visible hotel policy
    checkInHour: inHour,
    checkOutHour: outHour,
  };
}
