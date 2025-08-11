// src/utils/copyHotelDataFromAdmin.ts
import { Admin } from "../entities/Admin";

/**
 * Копирует данные отеля и общие настройки от admin к editor.
 * Личная информация не затрагивается.
 */
export function copyHotelDataFromAdmin(source: Admin) {
  return {
    hotel_name: source.hotel_name,
    address: source.address,
    logo_url: source.logo_url,
    // сюда можно добавить любые поля, которые должны копироваться
    // например, если будет телефон отеля:
    // hotel_phone: source.hotel_phone
  };
}
