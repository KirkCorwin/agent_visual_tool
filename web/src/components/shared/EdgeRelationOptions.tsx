import { EDGE_TYPES, type EdgeType } from "../../graph/types";
import type { CustomEdgePreset } from "../../graph/editorConfig";
import {
  isPresetOptionValue,
  presetIdFromOptionValue,
  presetOptionValue,
} from "../../lib/customEdgePresets";
import { CUSTOM_EDGE_OPTION, formatEdgeType } from "../../lib/edgeDisplay";

export function EdgeRelationSelectOptions({
  presets,
  includeCustom = true,
}: {
  presets: CustomEdgePreset[];
  includeCustom?: boolean;
}) {
  return (
    <>
      <optgroup label="Built-in">
        {EDGE_TYPES.map((t) => (
          <option key={t} value={t}>
            {formatEdgeType(t)}
          </option>
        ))}
      </optgroup>
      {presets.length > 0 ? (
        <optgroup label="Semantic">
          {presets.map((preset) => (
            <option key={preset.id} value={presetOptionValue(preset.id)}>
              {preset.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {includeCustom ? (
        <option value={CUSTOM_EDGE_OPTION}>Custom</option>
      ) : null}
    </>
  );
}

export function EdgeRelationMenuItems({
  presets,
  activeValue,
  onPickBuiltin,
  onPickPreset,
  onPickCustom,
}: {
  presets: CustomEdgePreset[];
  activeValue: string;
  onPickBuiltin: (edgeType: EdgeType) => void;
  onPickPreset: (preset: CustomEdgePreset) => void;
  onPickCustom: () => void;
}) {
  return (
    <>
      {EDGE_TYPES.map((edgeType) => (
        <li key={edgeType}>
          <button
            type="button"
            role="option"
            className={`edge-label__menu-item${activeValue === edgeType ? " edge-label__menu-item--active" : ""}`}
            onClick={() => onPickBuiltin(edgeType)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {formatEdgeType(edgeType)}
          </button>
        </li>
      ))}
      {presets.length > 0 ? (
        <>
          <li className="edge-label__menu-divider" aria-hidden />
          {presets.map((preset) => {
            const value = presetOptionValue(preset.id);
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  role="option"
                  className={`edge-label__menu-item${activeValue === value ? " edge-label__menu-item--active" : ""}`}
                  onClick={() => onPickPreset(preset)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {preset.label}
                </button>
              </li>
            );
          })}
        </>
      ) : null}
      <li className="edge-label__menu-divider" aria-hidden />
      <li>
        <button
          type="button"
          role="option"
          className={`edge-label__menu-item${activeValue === CUSTOM_EDGE_OPTION ? " edge-label__menu-item--active" : ""}`}
          onClick={onPickCustom}
          onPointerDown={(event) => event.stopPropagation()}
        >
          Custom
        </button>
      </li>
    </>
  );
}

export function parseEdgeRelationSelectChange(
  value: string,
  presets: CustomEdgePreset[],
): {
  edgeType?: EdgeType;
  isCustom: boolean;
  label?: string;
} {
  const presetId = presetIdFromOptionValue(value);
  if (presetId) {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      return { isCustom: true, label: preset.label };
    }
  }
  if (value === CUSTOM_EDGE_OPTION) {
    return { isCustom: true };
  }
  return { edgeType: value as EdgeType, isCustom: false, label: undefined };
}

export { isPresetOptionValue, CUSTOM_EDGE_OPTION };
