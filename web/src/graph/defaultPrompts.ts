import type { NodeType } from "./types";

/** Placeholders: {{title}}, {{type}}, {{graphJsonPath}}, {{bootstrapPath}}, {{packageRoot}} */
export const DEFAULT_BOOTSTRAP_PROMPT = `You are an AI coding agent opening this repository in a dev environment (Codespace, local clone, etc.).

**Goal:** Build the system described by this planning package.

## Start here

1. Read \`graph.json\` at the package root — canonical structure.
2. Open \`planning/README.md\` for the index of all planning artifacts.
3. Read the project node doc (planning/project/) for scope and orchestration notes.
4. Execute tasks in dependency order (see bootstrap sections). Run agents **sequentially** unless a doc says otherwise.

## Orchestration

- Treat each **agent** node as a separate pass; finish one agent's assigned work before starting the next.
- Respect **depends_on** edges between tasks.
- Use **implements** / **assigned_to** links when tracing ownership.

## Deliverable

Ship working code and tests aligned with constraints and decisions in the package. When blocked, document assumptions in the relevant markdown file and proceed.`;

export const DEFAULT_NODE_PROMPTS: Partial<Record<NodeType, string>> = {
  project: `## Agent instructions (project)

This node represents the **whole graph**. Before coding:

1. Read \`{{graphJsonPath}}\` and \`{{bootstrapPath}}\`.
2. Summarize scope from this file and linked requirements/features.
3. Drive execution via the bootstrap prompt — do not invent nodes not in the graph.

**Codespace / folder open:** If the user says "build this folder", treat \`{{packageRoot}}\` as the repo root and follow bootstrap task order.`,

  requirement: `## Agent instructions (requirement)

Capture the measurable requirement below. Implementation must satisfy this doc and linked features/components. Flag conflicts in a comment block at the bottom if the repo already diverges.`,

  feature: `## Agent instructions (feature)

Implement the capability described here. Split work across linked tasks; keep components cohesive. Update related markdown when behavior changes.`,

  component: `## Agent instructions (component)

Own the technical boundary for this component. Prefer small, testable modules. Link to tasks that implement or depend on this component.`,

  task: `## Agent instructions (task)

Executable work unit. Complete **depends_on** prerequisites first. If assigned to an agent, run in that agent's pass (sequential with other agents).`,

  agent: `## Agent instructions (agent)

**Sequential pass:** This agent runs after prior agents in bootstrap order complete. Do not parallelize with other agents unless the bootstrap prompt explicitly allows it.

Scope work to tasks **assigned_to** this agent.`,

  decision: `## Agent instructions (decision)

Record is binding for downstream tasks. If code contradicts this decision, fix code or update this doc with rationale.`,

  constraint: `## Agent instructions (constraint)

Hard rule — violations are defects. Check constraints before merging.`,

  folder: `## Agent instructions (folder)

Organizational grouping for export paths. Prefer linking child tasks/agents from this README context.`,
};

/** Placeholders: {{title}}, {{customLabel}} */
export const DEFAULT_CUSTOM_NODE_PROMPT = `## Agent instructions (custom: {{customLabel}})

User-defined node type. Scope work to this node's description and linked graph edges. Update this section when the role of "{{customLabel}}" changes.`;

export const NODE_PROMPT_EXPORT_TYPES: NodeType[] = [
  "project",
  "requirement",
  "feature",
  "component",
  "task",
  "agent",
  "decision",
  "constraint",
  "folder",
];

export function applyPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
