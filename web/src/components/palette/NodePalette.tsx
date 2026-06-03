import { useEffect, useRef, useState } from "react";
import { PALETTE_BUILTIN_TYPES } from "../../lib/planningNodeTypes";
import type { NodeType } from "../../graph/types";
import {
  endPaletteDrag,
  setPaletteDragData,
  type PaletteDragPayload,
} from "../../lib/paletteDrag";
import { MoreSettingsDialog } from "../settings/MoreSettingsDialog";
import { useGraphStore } from "../../store/graphStore";
import type { AccessibleColorMode } from "../../graph/types";
import {
  ACCESSIBLE_CATEGORICAL_SLOTS,
  NODE_TYPE_LABELS,
  resolveCustomDisplayColor,
  resolveNodeTypeColors,
  toggleAccessibleColorMode,
} from "../canvas/nodeStyles";
import type { CustomPaletteType } from "../../graph/types";
import { MAX_CUSTOM_PALETTE_TYPES } from "../../lib/customPaletteLimits";

const BUILTIN_PALETTE_TYPES = [...PALETTE_BUILTIN_TYPES, "folder"] as const;

function PaletteNodeButton({
  label,
  color,
  onAdd,
  dragPayload,
}: {
  label: string;
  color: string;
  onAdd: () => void;
  dragPayload: PaletteDragPayload;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="palette__btn"
      style={{ borderColor: color }}
      draggable
      onDragStart={(event) => {
        setPaletteDragData(event.dataTransfer, dragPayload);
        event.currentTarget.classList.add("palette__btn--dragging");
      }}
      onDragEnd={(event) => {
        endPaletteDrag();
        event.currentTarget.classList.remove("palette__btn--dragging");
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onAdd();
        }
      }}
      onClick={onAdd}
      title={label}
    >
      <span className="palette__dot" style={{ background: color }} />
      <span className="palette__btn-label">{label}</span>
    </div>
  );
}

function AccessibleColorPicker({
  mode,
  onSelect,
}: {
  mode: AccessibleColorMode;
  onSelect: (slot: 1 | 2 | 3) => void;
}) {
  const slots = [1, 2, 3] as const;
  return (
    <div className="palette__accessible">
      <span className="palette__accessible-label">Accessible colors</span>
      <div className="palette__accessible-options" role="group" aria-label="Accessible colors">
        {slots.map((slot) => {
          const active = mode === slot;
          const preview = ACCESSIBLE_CATEGORICAL_SLOTS[slot].slice(0, 3);
          return (
            <button
              key={slot}
              type="button"
              className={`palette__accessible-btn${active ? " palette__accessible-btn--active" : ""}`}
              aria-label={`Accessible palette option ${slot}`}
              aria-pressed={active}
              onClick={() => onSelect(slot)}
            >
              <span className="palette__accessible-num">{slot}</span>
              <span className="palette__accessible-swatches" aria-hidden>
                {preview.map((hex) => (
                  <span
                    key={hex}
                    className="palette__accessible-swatch"
                    style={{ background: hex }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomPaletteRow({
  entry,
  displayColor,
  onAdd,
  onRename,
  onRemove,
}: {
  entry: CustomPaletteType;
  displayColor: string;
  onAdd: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(entry.label);
    }
  }, [entry.label, editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim() || "Custom";
    onRename(next);
    setDraft(next);
    setEditing(false);
  };

  const cancelRename = () => {
    setDraft(entry.label);
    setEditing(false);
  };

  const dragPayload: PaletteDragPayload = {
    kind: "custom",
    customTypeId: entry.id,
  };

  return (
    <div
      className={`palette__custom-row${editing ? " palette__custom-row--editing" : ""}`}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="palette__custom-label-input"
          value={draft}
          aria-label="Custom node type name"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelRename();
            }
          }}
          onBlur={commitRename}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <PaletteNodeButton
          label={entry.label}
          color={displayColor}
          onAdd={onAdd}
          dragPayload={dragPayload}
        />
      )}
      <button
        type="button"
        className={`palette__custom-action palette__custom-rename${editing ? " palette__custom-action--active" : ""}`}
        title={editing ? "Editing name" : `Rename ${entry.label}`}
        aria-label={editing ? "Editing name" : `Rename ${entry.label}`}
        aria-pressed={editing}
        onClick={(event) => {
          event.stopPropagation();
          if (editing) {
            commitRename();
          } else {
            setDraft(entry.label);
            setEditing(true);
          }
        }}
      >
        T
      </button>
      <button
        type="button"
        className="palette__custom-action palette__custom-delete"
        title={`Remove ${entry.label} from palette`}
        aria-label={`Remove ${entry.label} from palette`}
        disabled={editing}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 6h18M8 6V4h8v2m-1 14H9a1 1 0 0 1-1-1V7h12v12a1 1 0 0 1-1 1z" />
        </svg>
      </button>
    </div>
  );
}

function SettingsToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="palette__toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function NodePalette() {
  const {
    graph,
    editorConfig,
    addNode,
    setGraphSettings,
    setEditorConfig,
    addCustomPaletteType,
    removeCustomPaletteType,
    updateCustomPaletteType,
  } = useGraphStore();
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const colors = resolveNodeTypeColors(graph.settings);
  const settings = graph.settings!;
  const customTypes = graph.customNodeTypes ?? [];
  const atCustomLimit = customTypes.length >= MAX_CUSTOM_PALETTE_TYPES;

  return (
    <aside className="palette">
      <h2 className="sidebar__title">Add node</h2>
      <p className="palette__hint">Drag onto the canvas or click to add.</p>
      <div className="palette__nodes">
        <div className="palette__grid">
          {BUILTIN_PALETTE_TYPES.map((nodeType) => (
            <PaletteNodeButton
              key={nodeType}
              label={NODE_TYPE_LABELS[nodeType]}
              color={colors[nodeType]}
              onAdd={() => addNode(nodeType as NodeType)}
              dragPayload={{ kind: "builtin", nodeType: nodeType as NodeType }}
            />
          ))}
          {customTypes.map((entry) => (
            <CustomPaletteRow
              key={entry.id}
              entry={entry}
              displayColor={resolveCustomDisplayColor(graph, entry.id)}
              onAdd={() =>
                addNode("custom", undefined, { customTypeId: entry.id })
              }
              onRename={(label) => updateCustomPaletteType(entry.id, label)}
              onRemove={() => removeCustomPaletteType(entry.id)}
            />
          ))}
        </div>
        <button
          type="button"
          className="palette__add-type"
          title={
            atCustomLimit
              ? `Maximum ${MAX_CUSTOM_PALETTE_TYPES} custom types`
              : "Add custom node type"
          }
          aria-label="Add custom node type"
          disabled={atCustomLimit}
          onClick={() => addCustomPaletteType()}
        >
          +
        </button>
      </div>
      <footer className="palette__settings">
        <span className="palette__settings-title">Settings</span>
        <SettingsToggle
          id="palette-delete-children"
          label="Delete child objects"
          checked={settings.deleteChildrenOnNodeDelete}
          onChange={(deleteChildrenOnNodeDelete) =>
            setGraphSettings({ deleteChildrenOnNodeDelete })
          }
        />
        <AccessibleColorPicker
          mode={settings.accessibleColorMode}
          onSelect={(slot) =>
            setGraphSettings({
              accessibleColorMode: toggleAccessibleColorMode(
                settings.accessibleColorMode,
                slot,
              ),
            })
          }
        />
        <SettingsToggle
          id="palette-edge-follows-label"
          label="Move edge with description"
          checked={settings.edgeFollowsLabel}
          onChange={(edgeFollowsLabel) =>
            setGraphSettings({ edgeFollowsLabel })
          }
        />
        <SettingsToggle
          id="palette-minimal-edge-labels"
          label="Minimal edge labels"
          checked={settings.minimalEdgeLabels}
          onChange={(minimalEdgeLabels) =>
            setGraphSettings({ minimalEdgeLabels })
          }
        />
        <SettingsToggle
          id="palette-copy-edges-paste"
          label="Copy edges when pasting"
          checked={editorConfig.copyEdgesOnPaste}
          onChange={(copyEdgesOnPaste) =>
            setEditorConfig({ copyEdgesOnPaste })
          }
        />
        <button
          type="button"
          className="palette__more-settings btn"
          onClick={() => setMoreSettingsOpen(true)}
        >
          More settings…
        </button>
      </footer>
      <MoreSettingsDialog
        open={moreSettingsOpen}
        onClose={() => setMoreSettingsOpen(false)}
      />
    </aside>
  );
}
