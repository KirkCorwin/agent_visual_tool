import { useState } from "react";
import type { AccessibleColorMode } from "../../graph/types";
import {
  ACCESSIBLE_CATEGORICAL_SLOTS,
  toggleAccessibleColorMode,
} from "../canvas/nodeStyles";
import { MoreSettingsDialog } from "../settings/MoreSettingsDialog";
import { useGraphStore } from "../../store/graphStore";

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

export function PaletteSettingsFooter() {
  const { graph, setGraphSettings } = useGraphStore();
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const settings = graph.settings!;

  return (
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
        onChange={(edgeFollowsLabel) => setGraphSettings({ edgeFollowsLabel })}
      />
      <SettingsToggle
        id="palette-minimal-edge-labels"
        label="Minimal edge labels"
        checked={settings.minimalEdgeLabels}
        onChange={(minimalEdgeLabels) => setGraphSettings({ minimalEdgeLabels })}
      />
      <button
        type="button"
        className="palette__more-settings btn"
        onClick={() => setMoreSettingsOpen(true)}
      >
        More settings…
      </button>
      <MoreSettingsDialog
        open={moreSettingsOpen}
        onClose={() => setMoreSettingsOpen(false)}
      />
    </footer>
  );
}
