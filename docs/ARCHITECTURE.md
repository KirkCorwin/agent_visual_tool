# Architecture

## Source of truth

`PlanningGraph` JSON (`graph.json` in exports) is canonical. The React canvas and all generators read/write this model only.

## Node types

`project`, `requirement`, `feature`, `component`, `task`, `agent`, `decision`, `constraint`, `folder`

Nodes may include optional `folderId` pointing at a folder node. On drag-stop, membership is updated from canvas position (node center inside folder bounds).

## Edge types

| Type | Meaning |
|------|---------|
| `depends_on` | Ordering or blocking dependency |
| `implements` | Realizes or fulfills |
| `assigned_to` | Work owned by an agent |
| `references` | Non-blocking reference |

## Canvas UX and z-order

Agents changing the React Flow canvas (stacking, opacity, inline edit, edge labels) must read **[CANVAS_DESIGN.md](./CANVAS_DESIGN.md)** first. It documents current behavior, intended stacking rules, the active fix checklist, and **custom palette panels** (four columns, drag-reorder, settings sync).

## Editor settings (v2)

`.editor-settings.json` holds stack-edge mapping, built-in `nodePrompts`, `bootstrapPrompt`, `customPromptsByTypeId`, and `customEdgePresets` (semantic relations such as loop/contain selectable from edge menus). Saving settings embeds a `settingsBundle` snapshot of `customNodeTypes` + `customPalettePages` for additive import; layout and types remain authoritative in `graph.json` after load.

## Layering

```text
web/src/graph/     Schema, validation, JSON, sample graph (no React)
web/src/export/    Markdown + ZIP + bootstrap (no React)
web/src/store/     Editor state (React)
web/src/components/ Canvas, palette, inspector, toolbar
```

## Export layout

```text
graph.json
planning/README.md
planning/project/<node-id>.md
planning/requirements/<node-id>.md
planning/features/<node-id>.md
planning/components/<node-id>.md
planning/decisions/<node-id>.md
planning/constraints/<node-id>.md
folders/<slug>/README.md
folders/<slug>/tasks/<node-id>.md   # when node.folderId is set
folders/<slug>/agents/…
folders/<slug>/planning/features/…
tasks/<node-id>.md
agents/<node-id>.md
prompts/bootstrap.md
```

Each markdown file includes a machine-readable HTML comment anchor (`<!-- node:id=… type=… -->`), human metadata, description, and a **Related** section with relative links derived from edges.

`prompts/bootstrap.md` is generated last; it lists tasks in `depends_on` topological order, agent assignments, and every file path in the package.

## Key modules

| Module | Role |
|--------|------|
| `buildPackage.ts` | Orchestrates all export files |
| `bootstrapPrompt.ts` | Agent entry prompt |
| `zipExport.ts` | JSZip browser download |
| `reactFlowAdapter.ts` | Canvas ↔ domain mapping |

## Versioning

`schemaVersion: 1` on every graph. Future migrations should live in `serialize.ts`.
