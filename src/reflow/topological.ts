import { WorkOrder } from "./types";
import "../sample-scenarios";

/**
 * Topological sort of work orders by dependency (dependsOnWorkOrderIds).
 * Result: an order where every order appears *before* its dependents (roots last).
 * Reflow then reverses this so we process roots first when assigning dates.
 * Uses DFS; detects cycles (impossible to complete) and missing dependency IDs.
 */
export function topological_sort(workOrders: WorkOrder[]) {
  // Look up work order by docId when following dependency links.
  const byId = new Map<string, WorkOrder>(
    workOrders.map((wo) => [wo.docId, wo]),
  );

  const visited = new Set<WorkOrder>(); // Already fully processed and in result
  const visiting = new Set<WorkOrder>(); // Currently on the DFS stack (for cycle detection)
  const result: WorkOrder[] = []; // Built by adding each node when we finish visiting it

  function dfs(order: WorkOrder) {
    if (visited.has(order)) {
      return; // Already in result; nothing to do
    }
    if (visiting.has(order)) {
      throw new Error(
        "There is a cycle in our orders completion is impossible.",
      );
    }

    visiting.add(order);

    // Visit all dependencies first (neighbors = IDs this order depends on).
    const neighbors = order.data.dependsOnWorkOrderIds;

    for (const neighbor of neighbors) {
      const neighborOrder = byId.get(neighbor);
      if (neighborOrder) {
        dfs(neighborOrder);
      } else {
        throw new Error("Neighbors id not found.");
      }
    }
    visiting.delete(order);
    visited.add(order);
    // Add this order to the front so dependencies come before dependents in the array.
    result.unshift(order);
  }

  for (const node of workOrders) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return result;
}
