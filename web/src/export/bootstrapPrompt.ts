import type { EditorConfig } from "../graph/editorConfig";
import { DEFAULT_EDITOR_CONFIG } from "../graph/editorConfig";
import type { PlanningGraph, PlanningNode } from "../graph/types";
import { linkToNode } from "./paths";

export const BOOTSTRAP_PROMPT_PATH = "prompts/bootstrap.md";

const PROMPT_FROM = "prompts/bootstrap.md";

function projectSlug(graph: PlanningGraph): string {
  return (
    graph.meta.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function getTaskExecutionOrder(graph: PlanningGraph): PlanningNode[] {
  const tasks = graph.nodes.filter((n) => n.type === "task");
  const taskIdSet = new Set(tasks.map((t) => t.id));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, 0);
    dependents.set(task.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.type !== "depends_on") {
      continue;
    }
    if (!taskIdSet.has(edge.source) || !taskIdSet.has(edge.target)) {
      continue;
    }
    inDegree.set(edge.source, (inDegree.get(edge.source) ?? 0) + 1);
    dependents.get(edge.target)!.push(edge.source);
  }

  const queue = tasks.filter((t) => inDegree.get(t.id) === 0);
  const ordered: PlanningNode[] = [];

  while (queue.length > 0) {
    const task = queue.shift()!;
    ordered.push(task);
    for (const nextId of dependents.get(task.id) ?? []) {
      const nextDegree = inDegree.get(nextId)! - 1;
      inDegree.set(nextId, nextDegree);
      if (nextDegree === 0) {
        const next = tasks.find((t) => t.id === nextId);
        if (next) {
          queue.push(next);
        }
      }
    }
  }

  for (const task of tasks) {
    if (!ordered.some((t) => t.id === task.id)) {
      ordered.push(task);
    }
  }

  return ordered;
}

function assignedAgent(
  graph: PlanningGraph,
  taskId: string,
  pathByNodeId: Map<string, string>,
): string | null {
  const edge = graph.edges.find(
    (e) => e.type === "assigned_to" && e.source === taskId,
  );
  if (!edge) {
    return null;
  }
  const agent = graph.nodes.find((n) => n.id === edge.target);
  if (!agent) {
    return null;
  }
  return linkToNode(PROMPT_FROM, agent, pathByNodeId);
}

function taskDependencies(
  graph: PlanningGraph,
  taskId: string,
  pathByNodeId: Map<string, string>,
): string[] {
  return graph.edges
    .filter((e) => e.type === "depends_on" && e.source === taskId)
    .map((e) => graph.nodes.find((n) => n.id === e.target))
    .filter((n): n is PlanningNode => Boolean(n))
    .map((n) => linkToNode(PROMPT_FROM, n, pathByNodeId));
}

export function renderBootstrapPrompt(
  graph: PlanningGraph,
  pathByNodeId: Map<string, string>,
  packagePaths: Iterable<string>,
  editorConfig: EditorConfig = DEFAULT_EDITOR_CONFIG,
): string {
  const lines: string[] = [
    `# Bootstrap: ${graph.meta.name}`,
    "",
    editorConfig.bootstrapPrompt.trim(),
    "",
    "## Package index",
    "",
    "1. Open [planning/README.md](../planning/README.md) for the full index.",
    "2. Use [graph.json](../graph.json) as the canonical structure.",
    "3. Follow tasks below in order unless a dependency blocks you.",
    "",
  ];

  const projects = graph.nodes.filter((n) => n.type === "project");
  if (projects.length > 0) {
    lines.push("## Project", "");
    for (const project of projects) {
      const path = pathByNodeId.get(project.id);
      const link = path
        ? `[${project.data.title}](../${path})`
        : project.data.title;
      lines.push(`- ${link}`);
      if (project.data.description?.trim()) {
        lines.push(`  - ${project.data.description.trim()}`);
      }
    }
    lines.push("");
  }

  const constraints = graph.nodes.filter((n) => n.type === "constraint");
  if (constraints.length > 0) {
    lines.push("## Constraints", "");
    for (const node of constraints) {
      lines.push(
        `- ${linkToNode(PROMPT_FROM, node, pathByNodeId)}${node.data.description ? `: ${node.data.description.trim()}` : ""}`,
      );
    }
    lines.push("");
  }

  const decisions = graph.nodes.filter((n) => n.type === "decision");
  if (decisions.length > 0) {
    lines.push("## Decisions", "");
    for (const node of decisions) {
      lines.push(`- ${linkToNode(PROMPT_FROM, node, pathByNodeId)}`);
    }
    lines.push("");
  }

  const orderedTasks = getTaskExecutionOrder(graph);
  if (orderedTasks.length > 0) {
    lines.push("## Tasks (suggested order)", "");
    orderedTasks.forEach((task, index) => {
      const deps = taskDependencies(graph, task.id, pathByNodeId);
      const agent = assignedAgent(graph, task.id, pathByNodeId);
      lines.push(
        `${index + 1}. ${linkToNode(PROMPT_FROM, task, pathByNodeId)}`,
      );
      if (deps.length > 0) {
        lines.push(`   - Depends on: ${deps.join(", ")}`);
      }
      if (agent) {
        lines.push(`   - Assigned to: ${agent}`);
      }
      if (task.data.status) {
        lines.push(`   - Status: ${task.data.status}`);
      }
    });
    lines.push("");
  }

  const agents = graph.nodes.filter((n) => n.type === "agent");
  if (agents.length > 0) {
    lines.push("## Agents", "");
    for (const agent of agents) {
      const assignedTasks = graph.edges
        .filter((e) => e.type === "assigned_to" && e.target === agent.id)
        .map((e) => graph.nodes.find((n) => n.id === e.source))
        .filter((n): n is PlanningNode => n?.type === "task");
      const taskLinks = assignedTasks
        .map((t) => linkToNode(PROMPT_FROM, t, pathByNodeId))
        .join(", ");
      lines.push(
        `- ${linkToNode(PROMPT_FROM, agent, pathByNodeId)}${agent.data.role ? ` (${agent.data.role})` : ""}`,
      );
      if (taskLinks) {
        lines.push(`  - Tasks: ${taskLinks}`);
      }
    }
    lines.push("");
  }

  lines.push("## Package files", "");
  const sorted = [...packagePaths].sort();
  for (const path of sorted) {
    lines.push(`- \`${path}\``);
  }
  lines.push("");
  lines.push(
    `_Generated for \`${projectSlug(graph)}\` at ${graph.meta.updatedAt}._`,
  );
  lines.push("");

  return lines.join("\n");
}
