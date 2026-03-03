import { WorkOrder } from "./types";
import "../sample-scenarios";

//topological sort for work orders

export function topological_sort(workOrders: WorkOrder[]) {
  const byId = new Map<string, WorkOrder>(
    workOrders.map((wo) => [wo.docId, wo]),
  );

  const visited = new Set<WorkOrder>();
  const visiting = new Set<WorkOrder>();
  const result: WorkOrder[] = [];

  function dfs(order: WorkOrder) {
    if (visited.has(order)) {
      return;
    }
    if (visiting.has(order)) {
      throw new Error(
        "there is a cycle in our orders completion is impossible",
      );
    }

    visiting.add(order);

    const neighbors = order.data.dependsOnWorkOrderIds;

    for (const neighbor of neighbors) {
      const neighborOrder = byId.get(neighbor);
      if (neighborOrder) {
        dfs(neighborOrder);
      } else {
        throw new Error("neighbors id not found");
      }
    }
    visited.add(order);
    visiting.delete(order);
    result.unshift(order);
  }

  for (const node of workOrders) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return result;
}
