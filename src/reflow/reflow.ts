import { ReflowInput, ReflowResult } from "./types";
import { scheduleOrder } from "./scheduler";
import { topological_sort } from "./topological";

/**
 * Reflow: reschedule work orders so dependencies and work-center ordering are satisfied.
 * 1. Topological sort gives an order where every order comes after its dependencies.
 * 2. We reverse so we process "roots first" (dependencies before dependents).
 * 3. Scheduler assigns start/end dates in that order; we return the result.
 * Ignores shifts/maintenance for now.
 */
export function reflow(input: ReflowInput): ReflowResult {
  // Get a valid order: each node after its dependencies. (Order is "roots last" in sorted.)
  const sorted = topological_sort(input.workOrders);
  // Reverse so we process roots first, then their dependents (scheduler needs deps already scheduled).
  const dependencyOrder = [...sorted].reverse();
  // Assign dates in that order; get back updated work orders and a list of what changed.
  const { updatedWorkOrders, changes } = scheduleOrder(dependencyOrder, input);
  // Human-readable summary.
  const explanation =
    changes.length === 0
      ? "No changes needed."
      : `Rescheduled ${changes.length} work order(s) to satisfy dependencies and work-center order.`;
  return { updatedWorkOrders, changes, explanation };
}
