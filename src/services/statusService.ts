// src/services/statusService.ts
// 
// ⚠️ ВАЖЛИВО: Цей сервіс ОТКЛЮЧЕНО в рамках переходу на повністю РУЧНУ модель статусів (Variant A).
//
// РАНІШЕ (до відключення):
//   - Автоматично змінював Stay.status (booked → occupied, occupied → completed) на основі дат/політик часу
//   - Автоматично змінював Room.status (occupied → free, free → occupied, cleaning) на основі дат/політик часу
//   - Викликався через cron scheduler кожні 30 секунд
//
// ЗАРАЗ:
//   - Всі зміни статусів Room/Stay виконуються ТІЛЬКИ вручну через контролери:
//     * check-in (admin/editor вручну міняє stay + room)
//     * check-out (вручну)
//     * set cleaning (вручну)
//     * finish cleaning (вручну)
//     * cancel stay (вручну)
//
//   - Cron може робити тільки одне: встановлювати stay.needsAction = true для просрочених stays
//     (це робить StayAutoCheckService, який НЕ змінює статуси)
//
// Цей файл залишено для історичної довідки, але метод tick() більше не викликається.
// Якщо потрібно повністю видалити цей код - можна зробити це пізніше.

import { AppDataSource } from "../config/data-source";
import { Stay } from "../entities/Stay";
import { Room } from "../entities/Room";
import {
  LessThanOrEqual,
  MoreThanOrEqual,
  MoreThan,
  In,
  EntityManager,
} from "typeorm";
import { APP_TIMEZONE, CRON_TOLERANCE_SECONDS } from "../config/time";
import { DateTime } from "luxon";
import {
  makeLocalDateTime,
  policyHoursFor,
  nowWithTolerance,
} from "../utils/policy";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
type RoomStatus = "free" | "occupied" | "cleaning";

export class StatusService {
  // Repositories via 'manager' inside a transaction ensure we operate within the tx.
  // No instance repositories are needed here.

  /**
   * ⚠️ ОТКЛЮЧЕНО: Цей метод більше не викликається.
   * 
   * Раніше він автоматично змінював статуси Stay/Room на основі дат/політик часу:
   *   - booked → occupied (коли настав час check-in)
   *   - occupied → completed (коли пройшов час check-out)
   *   - room.status → free/occupied/cleaning (на основі активних stays)
   * 
   * Тепер всі зміни статусів виконуються ТІЛЬКИ вручну через контролери.
   * 
   * @deprecated Використання цього методу заборонено. Використовуйте ручні endpoints.
   */
  public async tick(): Promise<void> {
    // Метод залишено порожнім, щоб уникнути помилок компіляції, якщо десь залишився виклик.
    // Насправді цей метод більше не повинен викликатися.
    console.warn(
      "[StatusService] tick() викликано, але автоматична зміна статусів ОТКЛЮЧЕНА. " +
      "Всі зміни статусів тепер виконуються тільки вручну через контролери."
    );
    return;
    
    /* ЗАКОМЕНТОВАНО - автоматична логіка більше не використовується:
    const { now } = nowWithTolerance();

    await AppDataSource.transaction(async (manager) => {
      const todayStart = now.startOf("day");

      // === 1) BOOKED → OCCUPIED when check-in time has arrived ===
      // ... (весь код закоментовано)
      
      // === 2) OCCUPIED → COMPLETED when check-out time has passed ===
      // ... (весь код закоментовано)
      
      // === 3) Safety reconciliation (compute from stays for all rooms) ===
      // await this.reconcileRooms(manager);
    });
    */
  }

  /**
   * ⚠️ ОТКЛЮЧЕНО: Цей метод більше не викликається.
   * 
   * Раніше він автоматично перераховував Room.status для всіх кімнат на основі:
   *   - активних stays (booked/occupied)
   *   - політик часу (check-in/check-out hours)
   *   - поточної дати/часу
   * 
   * Це конфліктувало з ручною моделлю, де статуси змінюються тільки через контролери.
   * 
   * @deprecated Використання цього методу заборонено.
   */
  private async reconcileRooms(manager: EntityManager): Promise<void> {
    // Метод залишено порожнім, щоб уникнути помилок компіляції.
    return;
    
    /* ЗАКОМЕНТОВАНО - автоматична логіка більше не використовується:
    const { now } = nowWithTolerance();
    const todayStart = now.startOf("day");

    const rooms = await manager.getRepository(Room).find({
      relations: ["admin"],
    });

    for (const room of rooms) {
      if (room.status === "cleaning") {
        continue;
      }
      const { inHour, outHour } = policyHoursFor(room);

      const candidates = await manager.getRepository(Stay).find({
        where: [
          {
            room: { id: room.id },
            checkIn: LessThanOrEqual(todayStart.toJSDate()),
            checkOut: MoreThanOrEqual(todayStart.toJSDate()),
            status: In(["booked", "occupied"] as StayStatus[]),
          },
          {
            room: { id: room.id },
            checkIn: MoreThan(todayStart.toJSDate()),
            status: "booked",
          },
        ],
        order: { checkIn: "ASC" },
      });

      // Check if any candidate actually covers 'now' by policy hours
      let covered = false;
      for (const s of candidates.filter(
        (s) =>
          s.checkIn <= todayStart.toJSDate() &&
          s.checkOut >= todayStart.toJSDate()
      )) {
        const sIn = makeLocalDateTime(s.checkIn, inHour);
        const sOut = makeLocalDateTime(s.checkOut, outHour);
        if (now >= sIn && now < sOut) {
          covered = true;
          break;
        }
      }

      const newStatus: RoomStatus = covered
        ? "occupied"
        : "free";

      if (room.status !== newStatus) {
        room.status = newStatus;
        await manager.getRepository(Room).save(room);
      }
    }
    */
  }
}
