import type { WorkOrder, WorkCenter, ManufacturingOrder } from "./reflow/types";

/** Line 1: Mon–Fri 8:00–17:00 UTC, no maintenance */
const workCenterLine1: WorkCenter = {
  docId: "wc-line1",
  docType: "workCenter",
  data: {
    name: "Extrusion Line 1",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 },
    ],
    maintenanceWindows: [],
  },
};

/** Line 2: same shifts, plus a maintenance window Tue 10:00–14:00 */
const workCenterLine2WithMaintenance: WorkCenter = {
  docId: "wc-line2",
  docType: "workCenter",
  data: {
    name: "Extrusion Line 2",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 },
    ],
    maintenanceWindows: [
      {
        startDate: "2025-03-04T10:00:00.000Z",
        endDate: "2025-03-04T14:00:00.000Z",
        reason: "Planned maintenance",
      },
    ],
  },
};

const manufacturingOrders: ManufacturingOrder[] = [
  {
    docId: "mo-1001",
    docType: "manufacturingOrder",
    data: {
      manufacturingOrderNumber: "MO-1001",
      itemId: "item-pipe-50mm",
      quantity: 1000,
      dueDate: "2025-03-10T17:00:00.000Z",
    },
  },
  {
    docId: "mo-1002",
    docType: "manufacturingOrder",
    data: {
      manufacturingOrderNumber: "MO-1002",
      itemId: "item-pipe-75mm",
      quantity: 500,
      dueDate: "2025-03-12T17:00:00.000Z",
    },
  },
];

// ——— Scenario 1: Delay cascade ———
// A → B → C on Line 1. A is delayed (180 min); B and C still have old times → overlaps. Reflow should move B and C after A.
export const scenario1DelayCascade = {
  workCenters: [workCenterLine1],
  manufacturingOrders,
  workOrders: [
    {
      docId: "wo-a",
      docType: "workOrder" as const,
      data: {
        workOrderNumber: "WO-A",
        manufacturingOrderId: "mo-1001",
        workCenterId: "wc-line1",
        startDate: "2025-03-03T08:00:00.000Z",
        endDate: "2025-03-03T11:00:00.000Z",
        durationMinutes: 180,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "wo-b",
      docType: "workOrder" as const,
      data: {
        workOrderNumber: "WO-B",
        manufacturingOrderId: "mo-1001",
        workCenterId: "wc-line1",
        startDate: "2025-03-03T09:00:00.000Z",
        endDate: "2025-03-03T10:00:00.000Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["wo-a"],
      },
    },
    {
      docId: "wo-c",
      docType: "workOrder" as const,
      data: {
        workOrderNumber: "WO-C",
        manufacturingOrderId: "mo-1001",
        workCenterId: "wc-line1",
        startDate: "2025-03-03T10:00:00.000Z",
        endDate: "2025-03-03T11:00:00.000Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["wo-b"],
      },
    },
  ] as WorkOrder[],
};

// ——— Scenario 2: Shift boundary ———
// One order: 120 min starting Monday 16:00. Shift ends 17:00 → 60 min Mon, 60 min Tue 08:00. End should be Tue 09:00.
export const scenario2ShiftBoundary = {
  workCenters: [workCenterLine1],
  manufacturingOrders,
  workOrders: [
    {
      docId: "wo-span",
      docType: "workOrder" as const,
      data: {
        workOrderNumber: "WO-SPAN",
        manufacturingOrderId: "mo-1002",
        workCenterId: "wc-line1",
        startDate: "2025-03-03T16:00:00.000Z",
        endDate: "2025-03-03T18:00:00.000Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
  ] as WorkOrder[],
};

// ——— Scenario 3: Maintenance conflict ———
// Order 09:00–11:00 on Line 2; maintenance 10:00–14:00. Reflow must move the order (e.g. after 14:00).
export const scenario3MaintenanceConflict = {
  workCenters: [workCenterLine2WithMaintenance],
  manufacturingOrders,
  workOrders: [
    {
      docId: "wo-maint-conflict",
      docType: "workOrder" as const,
      data: {
        workOrderNumber: "WO-MAINT-CONFLICT",
        manufacturingOrderId: "mo-1002",
        workCenterId: "wc-line2",
        startDate: "2025-03-04T09:00:00.000Z",
        endDate: "2025-03-04T11:00:00.000Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
  ] as WorkOrder[],
};

export const allScenarios = [
  { name: "Delay cascade (A→B→C)", ...scenario1DelayCascade },
  { name: "Shift boundary (120 min across 17:00)", ...scenario2ShiftBoundary },
  { name: "Maintenance conflict", ...scenario3MaintenanceConflict },
];
