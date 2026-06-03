import { touchGraph } from "./defaults";
import { parseUnknownGraph } from "./validation";
import type { ParseResult, PlanningGraph } from "./types";

export function serializePlanningGraph(
  graph: PlanningGraph,
  pretty = true,
): string {
  return JSON.stringify(graph, null, pretty ? 2 : undefined);
}

export function parsePlanningGraphJson(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, errors: ["Invalid JSON"] };
  }
  return parseUnknownGraph(raw);
}

export function clonePlanningGraph(graph: PlanningGraph): PlanningGraph {
  return structuredClone(graph);
}

export function withUpdatedGraph(graph: PlanningGraph): PlanningGraph {
  return touchGraph(clonePlanningGraph(graph));
}
