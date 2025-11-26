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
  searchStays,
  getStayById,
  getStayHistory,
} from "../controllers/stayQuery.controller";
import {
  checkInStay,
  checkOutStay,
  cancelStay,
  updateStayStatus,
  getNeedsActionStays,
  testAutoCheck,
  resolveNoShow,
  resolveCheckInNow,
  resolveCheckOutNow,
  resolveEditDates,
  resolveExtendStay,
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
 * PATCH /stays/:id/checkin
 * PATCH /stays/:id/checkout
 * PATCH /stays/:id/cancel
 * PUT /stays/:id/status — update stay status and sync room status
 */
router.patch("/:id/checkin", authenticateToken, isEditorOrAdmin, checkInStay);
router.patch(
  "/:id/checkout",
  authenticateToken,
  isEditorOrAdmin,
  checkOutStay
);
router.patch("/:id/cancel", authenticateToken, isEditorOrAdmin, cancelStay);
router.put("/:id/status", authenticateToken, isEditorOrAdmin, updateStayStatus);

/**
 * Search stays by guest name or updatedBy user
 * GET /stays/search?guest=doe&changedBy=frontdesk-1
 */
router.get("/search", authenticateToken, isEditorOrAdmin, searchStays);

/**
 * Get stays that need action (needsAction = true)
 * GET /stays/needs-action
 * Важливо: має бути перед /:id, інакше Express спробує обробити /needs-action як id
 */
router.get(
  "/needs-action",
  authenticateToken,
  isEditorOrAdmin,
  getNeedsActionStays
);

/**
 * Get stay status change history
 * GET /stays/:id/history
 * Важливо: має бути перед /:id, інакше Express спробує обробити /history як id
 */
router.get("/:id/history", authenticateToken, isEditorOrAdmin, getStayHistory);

/**
 * Get stay by ID
 * GET /stays/:id
 */
router.get("/:id", authenticateToken, isEditorOrAdmin, getStayById);

/**
 * Test endpoint: Manual trigger for auto-check (for testing)
 * POST /stays/test-auto-check
 */
router.post(
  "/test-auto-check",
  authenticateToken,
  isEditorOrAdmin,
  testAutoCheck
);

/**
 * Resolve actions for stays that need attention
 * POST /stays/:id/resolve/no-show
 * POST /stays/:id/resolve/check-in-now
 * POST /stays/:id/resolve/check-out-now
 * POST /stays/:id/resolve/edit-dates
 * POST /stays/:id/resolve/extend-stay
 */
router.post(
  "/:id/resolve/no-show",
  authenticateToken,
  isEditorOrAdmin,
  resolveNoShow
);
router.post(
  "/:id/resolve/check-in-now",
  authenticateToken,
  isEditorOrAdmin,
  resolveCheckInNow
);
router.post(
  "/:id/resolve/check-out-now",
  authenticateToken,
  isEditorOrAdmin,
  resolveCheckOutNow
);
router.post(
  "/:id/resolve/edit-dates",
  authenticateToken,
  isEditorOrAdmin,
  resolveEditDates
);
router.post(
  "/:id/resolve/extend-stay",
  authenticateToken,
  isEditorOrAdmin,
  resolveExtendStay
);

export default router;
