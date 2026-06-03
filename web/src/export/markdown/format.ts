import type { NodeData, NodeType, PlanningNode } from "../../graph/types";

export function nodeAnchor(node: PlanningNode): string {
  return `<!-- node:id=${node.id} type=${node.type} -->`;
}

export function formatOptionalField(label: string, value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }
  return `**${label}:** ${value}\n`;
}

export function formatNodeMetadata(node: PlanningNode): string {
  const lines = [`**Type:** ${node.type}`];
  if (node.data.status) {
    lines.push(`**Status:** ${node.data.status}`);
  }
  if (node.data.priority) {
    lines.push(`**Priority:** ${node.data.priority}`);
  }
  if (node.type === "agent" && node.data.role) {
    lines.push(`**Role:** ${node.data.role}`);
  }
  return lines.join("  \n");
}

export function formatDescription(data: NodeData): string {
  if (!data.description?.trim()) {
    return "_No description provided._\n";
  }
  return `${data.description.trim()}\n`;
}

export function sectionTitle(title: string): string {
  return `## ${title}\n\n`;
}

export function nodeTypeHeading(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    project: "Project",
    requirement: "Requirement",
    feature: "Feature",
    component: "Component",
    task: "Task",
    agent: "Agent",
    decision: "Decision",
    constraint: "Constraint",
    folder: "Folder",
    custom: "Custom",
  };
  return labels[type];
}
