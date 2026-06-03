# Agent Visual Tool

Local-first visual project architecture designer. Draw a planning graph, export Markdown + JSON for AI coding agents.

**Graph is the source of truth** — ZIP and markdown are always derived from the graph.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## First session

1. Click **Sample** to load a demo graph (all node and edge types).
2. Edit nodes in the **Inspector**; set **Project name** for export filenames.
3. Click **Export ZIP** and hand `prompts/bootstrap.md` to your agent.

Full walkthrough: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Build and test

```bash
cd web
npm run build
npm test
```

## Project layout

| Path | Purpose |
|------|---------|
| `web/src/graph/` | Schema, validation, JSON, sample graph |
| `web/src/export/` | Markdown, ZIP, bootstrap prompt |
| `web/src/components/` | Canvas, palette, inspector, toolbar |
| `docs/ARCHITECTURE.md` | Schema and export contract |
| `docs/CANVAS_DESIGN.md` | Canvas stacking, editing, edge labels (agent spec) |
| `docs/MILESTONES.md` | Delivery history |

## Features (V1)

- React Flow graph editor (8 node types, 4 edge types)
- Save / load `.graph.json` locally
- ZIP export with cross-linked planning markdown
- `prompts/bootstrap.md` for agent onboarding
- Sample graph template

## Status

V1 milestones **M0–M7** complete. See [docs/MILESTONES.md](docs/MILESTONES.md).
