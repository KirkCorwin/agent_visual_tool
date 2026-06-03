import { useMemo, useRef, useState } from "react";

import { renderNodeDocument } from "../../export/markdown/nodeDoc";
import { buildPathByNodeId, nodeExportPath } from "../../export/paths";
import { DEFAULT_CUSTOM_NODE_PROMPT } from "../../graph/defaultPrompts";
import {
  DEFAULT_EDITOR_CONFIG,
  NODE_PROMPT_EXPORT_TYPES,
  type EditorConfig,
  type StackEdgeSlotConfig,
} from "../../graph/editorConfig";
import { PALETTE_PAGE_IDS } from "../../lib/paletteLayout";
import {
  createCustomEdgePreset,
  MAX_CUSTOM_EDGE_PRESETS,
  slotConfigMenuValue,
} from "../../lib/customEdgePresets";
import type { CustomEdgePreset } from "../../graph/editorConfig";
import {
  EdgeRelationSelectOptions,
  parseEdgeRelationSelectChange,
} from "../shared/EdgeRelationOptions";
import {
  editorSettingsFileName,
  isLikelyEditorSettingsFile,
  readFileAsText,
} from "../../lib/fileIO";
import { useGraphStore } from "../../store/graphStore";
import "./moreSettings.css";

type Tab = "stack" | "edges" | "prompts" | "bootstrap";
type PromptSubTab = "builtin" | (typeof PALETTE_PAGE_IDS)[number];

function StackEdgeSlotEditor({
  label,
  slot,
  presets,
  onChange,
}: {
  label: string;
  slot: StackEdgeSlotConfig;
  presets: CustomEdgePreset[];
  onChange: (slot: StackEdgeSlotConfig) => void;
}) {
  const menuValue = slotConfigMenuValue(slot, presets);
  const showFreeText =
    slot.isCustom &&
    !presets.some((p) => p.label === (slot.label ?? "").trim());

  return (
    <div className="more-settings__slot">
      <span className="more-settings__slot-label">{label}</span>
      <select
        value={menuValue}
        onChange={(e) => {
          const patch = parseEdgeRelationSelectChange(e.target.value, presets);
          if (patch.isCustom) {
            onChange({
              ...slot,
              isCustom: true,
              label: patch.label ?? slot.label ?? "",
              edgeType: slot.edgeType,
            });
            return;
          }
          onChange({
            edgeType: patch.edgeType!,
            isCustom: false,
            label: undefined,
          });
        }}
      >
        <EdgeRelationSelectOptions presets={presets} />
      </select>
      {showFreeText ? (
        <input
          type="text"
          className="more-settings__custom-label"
          placeholder="Custom relation label"
          value={slot.label ?? ""}
          onChange={(e) =>
            onChange({ ...slot, isCustom: true, label: e.target.value })
          }
        />
      ) : null}
    </div>
  );
}

function CustomEdgePresetsEditor({
  presets,
  onChange,
}: {
  presets: CustomEdgePreset[];
  onChange: (presets: CustomEdgePreset[]) => void;
}) {
  const atLimit = presets.length >= MAX_CUSTOM_EDGE_PRESETS;

  return (
    <section className="more-settings__edge-presets">
      <p className="more-settings__intro">
        Named semantic relations appear in every edge type menu (canvas label,
        inspector, and stack mapping). They export like other custom edges.
      </p>
      <ul className="more-settings__preset-list">
        {presets.map((preset, index) => (
          <li key={preset.id} className="more-settings__preset-row">
            <input
              type="text"
              className="more-settings__preset-input"
              value={preset.label}
              aria-label={`Relation ${index + 1}`}
              onChange={(e) => {
                const label = e.target.value;
                onChange(
                  presets.map((p) =>
                    p.id === preset.id ? { ...p, label } : p,
                  ),
                );
              }}
            />
            <button
              type="button"
              className="btn btn--danger"
              aria-label={`Remove ${preset.label}`}
              onClick={() =>
                onChange(presets.filter((p) => p.id !== preset.id))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        disabled={atLimit}
        onClick={() =>
          onChange([...presets, createCustomEdgePreset("relation")])
        }
      >
        {atLimit
          ? `Maximum ${MAX_CUSTOM_EDGE_PRESETS} relations`
          : "Add relation"}
      </button>
    </section>
  );
}

export function MoreSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    graph,
    editorConfig,
    setEditorConfig,
    saveEditorConfigToFile,
    loadEditorConfigFromJson,
    reportLoadError,
    clearLoadError,
  } = useGraphStore();
  const [tab, setTab] = useState<Tab>("stack");
  const [promptSubTab, setPromptSubTab] = useState<PromptSubTab>("builtin");
  const fileRef = useRef<HTMLInputElement>(null);
  const pages = graph.customPalettePages ?? [];
  const typeById = new Map((graph.customNodeTypes ?? []).map((t) => [t.id, t]));

  const samplePreview = useMemo(() => {
    const type = tab === "bootstrap" ? "project" : "task";
    const sample =
      graph.nodes.find((n) => n.type === type) ??
      graph.nodes[0];
    if (!sample || tab === "bootstrap") {
      return editorConfig.bootstrapPrompt;
    }
    const pathByNodeId = buildPathByNodeId(graph);
    const filePath = nodeExportPath(sample, graph);
    return renderNodeDocument(
      sample,
      graph,
      filePath,
      pathByNodeId,
      editorConfig,
    );
  }, [graph, editorConfig, tab]);

  if (!open) {
    return null;
  }

  const updateMapping = (patch: Partial<EditorConfig["stackEdgeMapping"]>) => {
    setEditorConfig({
      stackEdgeMapping: {
        ...editorConfig.stackEdgeMapping,
        ...patch,
      },
    });
  };

  const handleLoadFile = async (file: File) => {
    if (!isLikelyEditorSettingsFile(file)) {
      reportLoadError("Choose a .editor-settings.json file.");
      return;
    }
    try {
      const text = await readFileAsText(file);
      loadEditorConfigFromJson(text);
      clearLoadError();
    } catch {
      reportLoadError("Could not read settings file.");
    }
  };

  return (
    <div className="more-settings-backdrop" role="presentation" onClick={onClose}>
      <div
        className="more-settings"
        role="dialog"
        aria-labelledby="more-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="more-settings__header">
          <h2 id="more-settings-title">More settings</h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="more-settings__tabs">
          {(
            [
              ["stack", "Parent ↔ child edges"],
              ["edges", "Edge relations"],
              ["prompts", "Node prompts"],
              ["bootstrap", "Bootstrap prompt"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`more-settings__tab${tab === id ? " more-settings__tab--active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="more-settings__toolbar">
          <button type="button" className="btn" onClick={saveEditorConfigToFile}>
            Save settings
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
            Load settings
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setEditorConfig(DEFAULT_EDITOR_CONFIG)}
          >
            Reset to defaults
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="toolbar__file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                void handleLoadFile(file);
              }
            }}
          />
        </div>
        <p className="more-settings__hint">
          Settings file: {editorSettingsFileName(graph)} — separate from the graph
          JSON.
        </p>

        <div className="more-settings__body">
          {tab === "stack" ? (
            <section>
              <p className="more-settings__intro">
                Implicit edges created for each stack parent/child pair (hidden on
                canvas, included in export).
              </p>
              <StackEdgeSlotEditor
                label="Child → parent"
                slot={editorConfig.stackEdgeMapping.childToParent}
                presets={editorConfig.customEdgePresets}
                onChange={(childToParent) => updateMapping({ childToParent })}
              />
              <StackEdgeSlotEditor
                label="Parent → child"
                slot={editorConfig.stackEdgeMapping.parentToChild}
                presets={editorConfig.customEdgePresets}
                onChange={(parentToChild) => updateMapping({ parentToChild })}
              />
            </section>
          ) : null}

          {tab === "edges" ? (
            <CustomEdgePresetsEditor
              presets={editorConfig.customEdgePresets}
              onChange={(customEdgePresets) => setEditorConfig({ customEdgePresets })}
            />
          ) : null}

          {tab === "prompts" ? (
            <section className="more-settings__prompts">
              <div className="more-settings__subtabs">
                <button
                  type="button"
                  className={`more-settings__subtab${promptSubTab === "builtin" ? " more-settings__subtab--active" : ""}`}
                  onClick={() => setPromptSubTab("builtin")}
                >
                  Built-in types
                </button>
                {PALETTE_PAGE_IDS.map((pageId) => {
                  const page = pages.find((p) => p.id === pageId);
                  return (
                    <button
                      key={pageId}
                      type="button"
                      className={`more-settings__subtab${promptSubTab === pageId ? " more-settings__subtab--active" : ""}`}
                      onClick={() => setPromptSubTab(pageId)}
                    >
                      {page?.name ?? pageId}
                    </button>
                  );
                })}
              </div>
              {promptSubTab === "builtin"
                ? NODE_PROMPT_EXPORT_TYPES.map((nodeType) => (
                    <label key={nodeType} className="more-settings__prompt-row">
                      <span className="more-settings__prompt-type">{nodeType}</span>
                      <textarea
                        rows={4}
                        value={editorConfig.nodePrompts[nodeType] ?? ""}
                        onChange={(e) =>
                          setEditorConfig({
                            nodePrompts: {
                              ...editorConfig.nodePrompts,
                              [nodeType]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))
                : (() => {
                    const page = pages.find((p) => p.id === promptSubTab);
                    const ids = page?.customTypeIds ?? [];
                    if (ids.length === 0) {
                      return (
                        <p className="more-settings__empty-palette">
                          No custom types on this palette.
                        </p>
                      );
                    }
                    return ids.map((typeId) => {
                      const custom = typeById.get(typeId);
                      const label = custom?.label ?? typeId;
                      return (
                        <label key={typeId} className="more-settings__prompt-row">
                          <span className="more-settings__prompt-type">{label}</span>
                          <textarea
                            rows={4}
                            value={
                              editorConfig.customPromptsByTypeId[typeId] ??
                              DEFAULT_CUSTOM_NODE_PROMPT
                            }
                            onChange={(e) =>
                              setEditorConfig({
                                customPromptsByTypeId: {
                                  ...editorConfig.customPromptsByTypeId,
                                  [typeId]: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      );
                    });
                  })()}
            </section>
          ) : null}

          {tab === "bootstrap" ? (
            <section>
              <label className="more-settings__prompt-row">
                <span className="more-settings__prompt-type">bootstrap.md lead-in</span>
                <textarea
                  rows={12}
                  value={editorConfig.bootstrapPrompt}
                  onChange={(e) =>
                    setEditorConfig({ bootstrapPrompt: e.target.value })
                  }
                />
              </label>
            </section>
          ) : null}

          <aside className="more-settings__preview">
            <h3>Markdown preview (sample)</h3>
            <pre className="more-settings__preview-md">{samplePreview}</pre>
          </aside>
        </div>
      </div>
    </div>
  );
}
