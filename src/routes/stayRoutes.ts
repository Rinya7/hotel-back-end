//Общие read-списки и ручные операции по stay-id.
//// routes/stayRoutes.ts
//import { Router } from "express";
//import {
//  getCurrentStays,
//  createStayForRoom,
//  updateStayByDates,
//  closeStay,
//  getStaysForRoom,
//} from "../controllers/stayController";
//import {
//  authenticateToken,
//  isEditorOrAdmin, // admin + editor
//  //  isAdmin,  только admin (на будущее для delete)
//} from "../middlewares/authMiddleware";
//import {
//  getStaysByStatus,
//  getArrivalsToday,
//  getDeparturesToday,
//} from "../controllers/stayQuery.controller";
//import {
//  manualCheckIn,
//  manualCheckOut,
//  manualCancel,
//} from "../controllers/stayOps.controller";

//const router = Router();

//// Поточні броні/заселення по всьому готелю (для dashboard)
//// (всі активні Stay, які не completed/cancelled)
//// GET /rooms/stays/current
//router.get(
//  "/stays/current",
//  authenticateToken,
//  isEditorOrAdmin,
//  getCurrentStays
//);

//// Створення броні/заселення по кімнаті
//// POST /rooms/number/:roomNumber/stays
//router.post(
//  "/number/:roomNumber/stays",
//  authenticateToken,
//  isEditorOrAdmin,
//  createStayForRoom
//);

//// 📜 Історія по конкретній кімнаті (опціонально ?from=YYYY-MM-DD&to=YYYY-MM-DD)
//// GET /rooms/number/:roomNumber/stays
//router.get(
//  "/number/:roomNumber/stays",
//  authenticateToken,
//  isEditorOrAdmin,
//  getStaysForRoom
//);

//// ✏️  Редагування броні/заселення (по вихідним checkIn/checkOut)
//// PUT /room/:roomNumber
//// (для адміна/editor)
//// PUT /rooms/number/:roomNumber/stays
//router.put(
//  "/number/:roomNumber/stays",
//  authenticateToken,
//  isEditorOrAdmin,
//  updateStayByDates
//);

//// ❌ Закрити (completed) / відмінити (cancelled)
//// PUT /rooms/number/:roomNumber/stays/close
//router.put(
//  "/number/:roomNumber/stays/close",
//  authenticateToken,
//  isEditorOrAdmin,
//  closeStay
//);

//// Booked / Occupied / Completed / Cancelled lists (you will mostly use booked/occupied)
//router.get(
//  "/stays/status/:status",
//  authenticateToken,
//  isEditorOrAdmin,
//  getStaysByStatus
//);

//// "Сегодня заселяются" — arrivals today (checkIn DATE = today)
//router.get(
//  "/stays/today/arrivals",
//  authenticateToken,
//  isEditorOrAdmin,
//  getArrivalsToday
//);

//// "Сегодня выселяются" — departures today (checkOut DATE = today)
//router.get(
//  "/stays/today/departures",
//  authenticateToken,
//  isEditorOrAdmin,
//  getDeparturesToday
//);

//// Если когда‑нибудь понадобится удаление Stay — лучше только admin
//// router.delete(
////   "/rooms/number/:roomNumber/stays",
////   authenticateToken,
////   isAdmin,
////   deleteStayByDates
//// );

///** Ручные операции доступны админам и редакторам текущего отеля */
//router.post(
//  "/stays/:id/check-in",
//  authenticateToken,
//  isEditorOrAdmin,
//  manualCheckIn
//);
//router.post(
//  "/stays/:id/check-out",
//  authenticateToken,
//  isEditorOrAdmin,
//  manualCheckOut
//);
//router.post(
//  "/stays/:id/cancel",
//  authenticateToken,
//  isEditorOrAdmin,
//  manualCancel
//);

//export default router;
// src/routes/stays.routes.ts
import { Router } from "express";
import { getCurrentStays } from "../controllers/stayController";
import {
  authenticateToken,
  isEditorOrAdmin, // admin + editor
} from "../middlewares/authMiddleware";
import {
  getStaysByStatus,
  getArrivalsToday,
  getDeparturesToday,
} from "../controllers/stayQuery.controller";
import {
  manualCheckIn,
  manualCheckOut,
  manualCancel,
} from "../controllers/stayOps.controller";

const router = Router();

/**
 * Current active stays for the whole hotel (not completed/cancelled).
 * GET /stays/current
 */
router.get("/current", authenticateToken, isEditorOrAdmin, getCurrentStays);

/**
 * Lists by stay status: booked / occupied / completed / cancelled
 * GET /stays/status/:status
 */
router.get(
  "/status/:status",
  authenticateToken,
  isEditorOrAdmin,
  getStaysByStatus
);

/**
 * Arrivals today (DATE equality in hotel TZ)
 * GET /stays/today/arrivals
 */
router.get(
  "/today/arrivals",
  authenticateToken,
  isEditorOrAdmin,
  getArrivalsToday
);

/**
 * Departures today (DATE equality in hotel TZ)
 * GET /stays/today/departures
 */
router.get(
  "/today/departures",
  authenticateToken,
  isEditorOrAdmin,
  getDeparturesToday
);

/**
 * Manual operations on a specific stay
 * POST /stays/:id/check-in
 * POST /stays/:id/check-out
 * POST /stays/:id/cancel
 */
router.post("/:id/check-in", authenticateToken, isEditorOrAdmin, manualCheckIn);
router.post(
  "/:id/check-out",
  authenticateToken,
  isEditorOrAdmin,
  manualCheckOut
);
router.post("/:id/cancel", authenticateToken, isEditorOrAdmin, manualCancel);

export default router;
