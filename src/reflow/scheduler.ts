import { ReflowChange, ReflowInput, WorkOrder } from "./types";

/**
 * Add a number of minutes to an ISO date string; returns a new ISO string.
 * Used to compute end time from start time + duration (wall-clock; no shift logic).
 */
function addMinutes(isoDate: string, minutes: number): string {
  const d = new Date(isoDate);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/**
 * Given one or more ISO date strings, return the latest (most recent) one.
 * Used to pick "earliest possible start" = max(dependency ends, last job on work center).
 */
function latestIso(...dates: string[]): string {
  if (dates.length === 0)
    throw new Error("latestIso requires at least one date");
  return dates.reduce((a, b) => (a > b ? a : b));
}

/**
 * Assigns start/end dates to work orders that are already in dependency order.
 * - Each order starts after all its dependencies have ended.
 * - On each work center, only one job runs at a time (next starts after previous ends).
 * - Maintenance orders are left unchanged and still block their work center.
 * Ignores shifts/maintenance windows for now (simple wall-clock duration).
 */
export function scheduleOrder(
  workOrdersInOrder: WorkOrder[],
  _input: ReflowInput,
): { updatedWorkOrders: WorkOrder[]; changes: ReflowChange[] } {
  // We'll collect the new work orders and any changes (old vs new dates).
  const updatedWorkOrders: WorkOrder[] = [];
  const changes: ReflowChange[] = [];

  // After we schedule each order, we record its end time so later orders can depend on it.
  const scheduledEndByDocId = new Map<string, string>();
  // Per work center: when did the last job on that center end? (so the next one starts after)
  const lastEndByWorkCenter = new Map<string, string>();

  for (const wo of workOrdersInOrder) {
    // Maintenance orders are never rescheduled; we just keep their time and block the center.
    if (wo.data.isMaintenance) {
      updatedWorkOrders.push(wo);
      lastEndByWorkCenter.set(wo.data.workCenterId, wo.data.endDate);
      continue;
    }

    // Earliest we can start: all dependencies must have finished. Get each dependency's scheduled end.
    const dependencyEnds = wo.data.dependsOnWorkOrderIds
      .map((id) => scheduledEndByDocId.get(id))
      .filter((end): end is string => end != null);

    // Also: on this work center, the previous job must have ended (one at a time per center).
    const workCenterLast = lastEndByWorkCenter.get(wo.data.workCenterId);
    const candidateStarts = [...dependencyEnds];
    if (workCenterLast != null) candidateStarts.push(workCenterLast);

    // New start = latest of all those end times (so we're after everyone). If none, keep original start.
    const newStart =
      candidateStarts.length > 0
        ? latestIso(...candidateStarts)
        : wo.data.startDate;
    // End = start + duration (simple wall-clock; no shift boundaries yet).
    const newEnd = addMinutes(newStart, wo.data.durationMinutes);

    // Record this order's end for future dependencies and for the next job on this center.
    scheduledEndByDocId.set(wo.docId, newEnd);
    lastEndByWorkCenter.set(wo.data.workCenterId, newEnd);

    // Build the updated work order with new start/end.
    const updatedWo: WorkOrder = {
      ...wo,
      data: {
        ...wo.data,
        startDate: newStart,
        endDate: newEnd,
      },
    };
    updatedWorkOrders.push(updatedWo);

    // If dates actually changed, record a change for reporting.
    if (wo.data.startDate !== newStart || wo.data.endDate !== newEnd) {
      changes.push({
        workOrderId: wo.docId,
        workOrderNumber: wo.data.workOrderNumber,
        oldStart: wo.data.startDate,
        oldEnd: wo.data.endDate,
        newStart,
        newEnd,
        reason: "Rescheduled to satisfy dependencies and work center order.",
      });
    }
  }

  return { updatedWorkOrders, changes };
}
