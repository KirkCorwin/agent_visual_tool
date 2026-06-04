# Canvas design guide (agents)

This document is the **canonical UX + stacking spec** for the React Flow planning canvas. Use it before changing z-order, node chrome, inline editing, or edge labels.

**Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) (data model / export), [USER_GUIDE.md](./USER_GUIDE.md) (end-user flows).

---

## 1. Key source files

| Area | Files |
|------|--------|
| Z-order (nodes + edges) | `web/src/graph/nodeZIndex.ts`, `web/src/graph/nodeHierarchy.ts` |
| RF adapter | `web/src/graph/reactFlowAdapter.ts` (`toFlowEdges`, `mergeDisplayNodes`) |
| Canvas shell | `web/src/components/canvas/GraphCanvas.tsx` |
| Node UI | `PlanningFlowNode.tsx`, `FolderFlowNode.tsx`, `canvas.css` |
| Edge UI | `PlanningFlowEdge.tsx`, `EdgeLabelEditor.tsx`, `EdgeHitOverlay.tsx` |
| Dropdown overlays | `DropdownMenuPortal.tsx`, `overlayZIndex.ts` |
| Inline text | `web/src/components/shared/InlineEditable.tsx` |
| Settings | `web/src/graph/types.ts` (`GraphEditorSettings`), `NodePalette.tsx` |

**React Flow flags (do not revert without updating this doc):**

- `zIndexMode="manual"`
- `elevateNodesOnSelect={false}`, `elevateEdgesOnSelect={false}`
- Hierarchy uses graph `parentId` only (not RF native nesting)

---

## 2. Node stacking (current)

### Structural z (`computeStackZIndexes`)

- Children **above** parents (`ANCESTOR_Z_GAP = 1` enforced in `enforceAncestorDescendantZOrder`).
- Under the same parent: **folders below** planning siblings; smaller area tends to sort earlier among siblings.
- Steps: `FOLDER_STEP = 2`, `PLANNING_STEP = 10`.

### Drag / selection

- **Leaf** drags may elevate z temporarily; **containers** (nodes with nested children) move without reshuffling stack z.
- Selection uses **outline on `.react-flow__node`**, not opacity jumps.

### Visual opacity (current)

- All planning cards and folders: **`opacity: 0.9`** so edges show through.
- Descendants when a nested parent is focused: **`opacity: 0.82`**.

---

## 3. Edge stacking (current)

Implemented in `computeEdgeZIndexes`:

1. **Below both endpoints:** `z <= min(sourceZ, targetZ) - EDGE_BELOW_ENDPOINT_GAP` (`EDGE_BELOW_ENDPOINT_GAP = 2`).
2. **Above crossed containers:** for each strict ancestor of either endpoint (excluding the endpoints themselves), `z >= ancestorZ + 1`.
3. Final `z` is clamped so it stays below both endpoints after the container floor is applied.

**Labels:** `PlanningFlowEdge` sets label `zIndex = edgeZ + 1` (still below endpoint nodes when gap is 2).

**Hit targets:** `EdgeHitOverlay` uses a separate portal (`z-index: 12` in CSS); do not pin `.react-flow__edgelabel-renderer` to a fixed z (per-label z must interleave with nodes).

### Known gaps (current behavior vs intent)

| Scenario | Current | Intended |
|----------|---------|----------|
| Peer ↔ peer on same layer | Below both endpoints | Same ✓ |
| Sibling of endpoint (same `parentId`) | Not explicitly capped | Edge **below** siblings (same rule as peer links) |
| Outside → child under parent | Above parent ancestors | Above **full ancestor chain** of nested endpoint; below endpoint + siblings under that parent |
| Cousin / unrelated nodes (not under branch parent) | May paint **under** unrelated high-z nodes | Edge **below** those nodes (they paint on top) |
| Deep stack P → P → child | Above each crossed parent | Above **all** strict ancestors on the nested side |

---

## 4. Edge stacking (intended algorithm)

Think in **layers**: each parent is a tray; children are a layer above. Edges are ribbons:

- **Always under** the two endpoint nodes.
- **Always under** any node that shares the same immediate parent as an endpoint (sibling peers on that layer).
- **Always over** every strict ancestor container the edge passes through (parent, grandparent, … on the nested path).
- **Always under** nodes **outside** the nested branch (not a descendant of the nested endpoint’s `parentId` branch root), when their z would otherwise compete in the band between container floor and endpoints.

Proposed computation for edge `(S, T)`:

```text
floorZ  = max( z(A)+1 ) for strict ancestors A of S or T, A ∉ {S,T}
ceiling = min(
  z(S)-2, z(T)-2,
  z(N)-2 for each sibling N of S or T (same parentId, N ∉ {S,T}),
  z(N)-2 for each "exterior" node N (see below) with z(N) > floorZ
)
edgeZ   = clamp(floorZ, …, ceiling)
```

**Branch exterior (confirmed):** For the deeper endpoint `E`, let `P = E.parentId`. Exterior nodes are those **not** descending from `P` (not in `P`’s subtree). Apply `z <= z(N)-2` for **every** exterior node `N` (global ceiling). Implementation must still clamp above `floorZ` so container rules are not violated; document edge cases where exterior nodes have very high z.

Add/extend tests in `nodeZIndex.test.ts` for:

- sibling ↔ sibling under same parent;
- outside → child;
- grandparent → child (stacked parents);
- cousin / unrelated node above edge.

---

## 5. Inline editing (current)

| Field | Component | `editOnClick` | Open gesture |
|-------|-----------|---------------|--------------|
| Title | `PlanningFlowNode` | `false` | **Double-click** only |
| Description | `PlanningFlowNode` | `true`, `clickToEditDelay={0}` | **Pointer-down** (immediate single-click) |
| Folder title/desc | `FolderFlowNode` | default / varies | Check file when changing |

`InlineEditable` behavior:

- `editOnClick={false}`: click → `onSelect` only; **double-click** → edit.
- `editOnClick` + `clickToEditDelay={0}`: **pointerdown** → edit (click handler skipped).
- `nodrag nopan` on **description block wrapper** only; display `<span>` does not add `nodrag` until editing — drag vs edit can conflict.

### Intended (confirmed 2026-06-02)

- **Double-click to edit** title and description on planning nodes (and folders where applicable).
- **Single click** = select node only (`editOnClick={false}` on both fields; remove description `clickToEditDelay={0}` pointer-down fast path).
- Align `InlineEditable` tooltips with double-click.
- Remove conflicting description-only pointer-down open so double-click is reliable on the canvas.

---

## 6. Edge labels & settings

| Setting | Default | Location |
|---------|---------|----------|
| `edgeFollowsLabel` | `false` | Path reroutes through label when dragged |
| `minimalEdgeLabels` | `false` | Chip shows one capitalized letter; narrow toolbar |

### Minimal mode (current issues)

- Type dropdown button is **~1.1rem** wide — hard to hit.
- **Intended:** minimum **28×28px** hit target (or full toolbar height clickable for menu); keep drag handle separate; `title` shows full relation on hover.

### Label z

- Always `edgeZIndex + 1` from `PlanningFlowEdge` data for the **label chip** (toolbar, drag handle).
- **Dropdown menus must not** inherit this z — see §6.1.

### 6.1 Temporary dropdown overlays (UI guidance)

Canvas dropdowns are **short-lived** UI (node type picker, edge relation picker, etc.). They must **always paint above** all graph nodes and edges, regardless of per-node `zIndex`.

| Rule | Detail |
|------|--------|
| Portal | Render with `DropdownMenuPortal` → `createPortal(..., document.body)` |
| Position | `position: fixed`, anchored to trigger via `getBoundingClientRect()` |
| Z-index | `CANVAS_DROPDOWN_Z_INDEX` (**3000**) from `web/src/lib/overlayZIndex.ts` |
| Marker | Portaled menu root gets `data-canvas-dropdown` for outside-click dismissal |
| Do **not** | Rely on `z-index` inside `.react-flow__edgelabel-renderer` or node stacking contexts — those follow graph z-order and will interleave incorrectly with high-z nodes |

**Stack bands (low → high):**

1. Graph nodes / edges / label chips — manual `zIndex` (typically 0–~2000)
2. Canvas dropdowns + floating inline edit — **3000** (`CANVAS_DROPDOWN_Z_INDEX`)
3. Modal dialogs (More settings) — **4000** (`MODAL_Z_INDEX`)

**Implementation:** `web/src/components/shared/DropdownMenuPortal.tsx` (shared by `NodeTypeMenu`, `EdgeLabelEditor`).

---

## 7. Implementation checklist (active initiative)

Use this as the execution order after user confirms choices:

### Phase A — Editing consistency

- [x] Pick single vs double-click → **double-click** (confirmed).
- [x] Align `PlanningFlowNode` title + description (and `FolderFlowNode` if needed).
- [ ] Update `InlineEditable` titles / optional `nodrag` on display state when single-click edit.
- [ ] Manual QA: select node, edit title/desc, drag node by header vs body, nested parent selected.

### Phase B — Minimal edge label UX

- [x] CSS: larger minimal type-button hit target (~28px).
- [ ] Optional: chevron-only button + invisible expanded hit slop.
- [ ] QA: open type menu, drag label, custom type in minimal mode.

### Phase C — Edge z refinement

- [x] Exterior rule → **all exterior nodes** outside branch parent subtree (confirmed).
- [x] Extend `computeEdgeZIndexes` (sibling + branch-exterior ceilings).
- [ ] Add tests listed in §4.
- [ ] Visual QA: outside→child, sibling peers, stacked parents, unrelated node on top.

### Phase D — Docs

- [ ] Update this file “current” tables after ship.
- [ ] Link from `ARCHITECTURE.md` and `README.md`.

---

## 8. Custom palettes (four panels)

| Concern | Where it lives |
|---------|----------------|
| Type definitions (`id`, `label`, `color`) | `graph.json` → `customNodeTypes` |
| Per-panel order and names | `graph.json` → `customPalettePages` (four fixed ids: `palette-1` … `palette-4`) |
| Export prompts per custom type | `.editor-settings.json` → `customPromptsByTypeId` |
| Settings import snapshot | `settingsBundle` on save (types + pages); **additive** on load |

### UI

- **Palette 1** (master): built-in node types + custom types assigned to page 1; footer launchers for palettes 2–4 (`Name +N` when `N > 0`).
- **Palettes 2–4**: toggle open from launchers; **×** closes; chain launchers on each open column.
- **+** adds a type to **that column’s** palette; caps: **30** on palette 1, **40** on palettes 2–4 (shows **Max Nodes** when full).
- Scroll area: built-ins + customs scroll; **+**, launchers, and settings stay pinned below with a dark thin scrollbar on the right.
- Reorder: **⋮⋮** handle; drag to canvas: **⤴** handle (avoids conflict with sortable).
- **T** on column header renames the page; **T** on a row renames the custom type.
- Drag **⋮⋮** handle: reorder within a panel or drop on another open panel / launcher (white border = accept, red = at cap).
- Drag the node chip (native): drop on canvas (unchanged `paletteDrag` payload).

### Code map

- `web/src/lib/paletteLayout.ts` — normalize pages, cap helpers
- `web/src/components/palette/PaletteDock.tsx` — columns + `@dnd-kit`
- `web/src/store/paletteUiStore.tsx` — open/closed flags (not in graph JSON)
- `web/src/graph/applyEditorSettings.ts` — merge on settings load

---

## 9. Non-goals (unless asked)

- RF native parent-child nesting.
- Geometry-based edge z (only structural z today).
- Changing export schema for canvas UX tweaks.

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-06-02 | Initial guide: layering intent, editing inconsistency, minimal label hit targets, active checklist |
| 2026-06-02 | Custom palettes section: four panels, DnD, settings/graph split |
| 2026-06-03 | §6.1: portaled canvas dropdowns at z-index 3000 (`DropdownMenuPortal`) |
