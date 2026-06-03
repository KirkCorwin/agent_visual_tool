# User guide

## What this tool does

Agent Visual Tool is a **local-first** editor for software project architecture. You draw nodes and edges on a canvas; everything exports as a planning package for AI coding agents.

The **graph JSON is the source of truth**. Markdown files and ZIP archives are generated from it—never the other way around.

## Quick start (under 2 minutes)

1. Run the app: `cd web && npm install && npm run dev`
2. Click **Sample** in the toolbar (or **Load sample graph** on the canvas overlay).
3. Pan/zoom the canvas; click a node to edit title and description in the inspector.
4. Click **Export ZIP** and unzip the download.
5. Give an agent **`prompts/bootstrap.md`** plus the rest of the folder.

## Canvas

| Action | How |
|--------|-----|
| Add node | Drag from left palette onto canvas, or click a type |
| Connect | Hold **C** (canvas won’t pan). Drag from a node: a line follows the cursor and snaps when over a target; release to connect or cancel. Keep holding C to chain more links. |
| Multi-select | **Shift+click** nodes or edges to add to the selection |
| Rename | **Double-click** a node title or edge label on the canvas |
| Folder | Add **Folder** from palette; drag nodes inside; exports go under `folders/<name>/` |
| Move node | Drag on canvas |
| Select | Click node or edge |
| Delete | Select → Delete key or **Delete selected** |
| Edit | Inspector (right) |

## Node types

| Type | Typical use |
|------|-------------|
| Project | Top-level product or repo |
| Requirement | Must-have outcome |
| Feature | User-visible capability |
| Component | Module, service, or layer |
| Task | Concrete work item |
| Agent | Persona or agent role |
| Decision | Recorded architectural choice |
| Constraint | Non-negotiable rule |
| Edge | See ARCHITECTURE.md |

## Edge types

| Type | Meaning |
|------|---------|
| `depends_on` | Must happen after / blocked by |
| `implements` | Realizes or delivers |
| `assigned_to` | Owned by an agent |
| `references` | Related, non-blocking |

## Save and load

- **Save graph** — Downloads `<project-slug>.graph.json` (canonical graph).
- **Load graph** — Replaces the canvas only after validation succeeds. Invalid files show an error and leave your current graph untouched.

## Export package

**Export ZIP** produces:

```text
graph.json                 # canonical graph
planning/README.md         # index
planning/project/…         # per-node markdown
planning/requirements/…
planning/features/…
planning/components/…
planning/decisions/…
planning/constraints/…
tasks/…
agents/…
prompts/bootstrap.md       # agent entry prompt
```

**Check export** validates the package in memory and reports file count without downloading.

## Tips

- Set **Project name (export)** in the inspector so save/ZIP filenames match your repo.
- Keep one **project** node when possible; the exporter warns if none exists.
- Use **depends_on** between tasks so `bootstrap.md` lists a sensible execution order.
- Use **assigned_to** from task → agent so bootstrap includes agent briefs.

## Keyboard

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected node or edge |

## Privacy

No backend, no network calls for core features. Graphs stay in your browser until you save or export.
