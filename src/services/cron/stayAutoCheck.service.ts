// src/services/cron/stayAutoCheck.service.ts
// Автоматична перевірка просрочених check-in та check-out дат.
// Виконується щодня о 03:00 за часом готелю.
// Встановлює needsAction=true для stays, які потребують дії адміністратора.

import { AppDataSource } from "../../config/data-source";
import { Stay } from "../../entities/Stay";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "../../config/time";

/**
 * Сервіс для автоматичної перевірки просрочених stays.
 * Встановлює needsAction=true та needsActionReason для stays, які:
 * - Мають статус "booked" та checkIn < today (missed_checkin)
 * - Мають статус "occupied" та checkOut < today (missed_checkout)
 * 
 * НЕ змінює stay.status - це робиться вручну через resolve endpoints.
 * НЕ створює StayStatusLog - логування відбувається тільки при фінальних діях.
 */
export class StayAutoCheckService {
  /**
   * Виконує автоматичну перевірку просрочених stays.
   * Викликається cron job щодня о 03:00.
   * Повертає статистику виконаної перевірки.
   */
  async checkOverdueStays(): Promise<{
    missedCheckIns: number;
    missedCheckOuts: number;
    total: number;
  }> {
    const stayRepo = AppDataSource.getRepository(Stay);
    
    // Отримуємо поточну дату в часовому поясі готелю
    const today = DateTime.now().setZone(APP_TIMEZONE).startOf("day");
    // Використовуємо DATE формат (YYYY-MM-DD) для порівняння з колонками типу DATE
    const todayDateStr = today.toFormat("yyyy-MM-dd");

    try {
      // 1. Перевіряємо booked stays з просроченим check-in
      // Використовуємо DATE порівняння через SQL функцію
      const missedCheckInStays = await stayRepo
        .createQueryBuilder("stay")
        .where("stay.status = :status", { status: "booked" })
        .andWhere("DATE(stay.checkIn) < DATE(:today)", { today: todayDateStr })
        .andWhere("(stay.needsAction = false OR stay.needsActionReason IS NULL OR stay.needsActionReason != :reason)", {
          reason: "missed_checkin",
        })
        .getMany();

      if (missedCheckInStays.length > 0) {
        for (const stay of missedCheckInStays) {
          stay.needsAction = true;
          stay.needsActionReason = "missed_checkin";
        }
        await stayRepo.save(missedCheckInStays);
        console.log(
          `[StayAutoCheck] Marked ${missedCheckInStays.length} stays with missed check-in`
        );
      }

      // 2. Перевіряємо occupied stays з просроченим check-out
      const missedCheckOutStays = await stayRepo
        .createQueryBuilder("stay")
        .where("stay.status = :status", { status: "occupied" })
        .andWhere("DATE(stay.checkOut) < DATE(:today)", { today: todayDateStr })
        .andWhere("(stay.needsAction = false OR stay.needsActionReason IS NULL OR stay.needsActionReason != :reason)", {
          reason: "missed_checkout",
        })
        .getMany();

      if (missedCheckOutStays.length > 0) {
        for (const stay of missedCheckOutStays) {
          stay.needsAction = true;
          stay.needsActionReason = "missed_checkout";
        }
        await stayRepo.save(missedCheckOutStays);
        console.log(
          `[StayAutoCheck] Marked ${missedCheckOutStays.length} stays with missed check-out`
        );
      }

      const total = missedCheckInStays.length + missedCheckOutStays.length;
      console.log(
        `[StayAutoCheck] Completed check at ${today.toISO()} (${APP_TIMEZONE}). Marked ${total} stays (${missedCheckInStays.length} missed check-ins, ${missedCheckOutStays.length} missed check-outs)`
      );

      return {
        missedCheckIns: missedCheckInStays.length,
        missedCheckOuts: missedCheckOutStays.length,
        total,
      };
    } catch (error) {
      console.error("[StayAutoCheck] Error during check:", error);
      throw error;
    }
  }
}

