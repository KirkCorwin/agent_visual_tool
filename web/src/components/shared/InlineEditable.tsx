import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FloatingFieldPortal } from "../canvas/FloatingFieldPortal";

/** Only on the active text field — not the whole node — so the card can still be dragged elsewhere. */
const EDIT_FIELD_INTERACTION_CLASS = "nodrag nopan";

const blockCanvasPointer = (event: React.PointerEvent | React.MouseEvent) => {
  event.stopPropagation();
};

function resizeTextareaToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function scrollTextareaCaretIntoView(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const lineHeight =
    Number.parseFloat(getComputedStyle(textarea).lineHeight) || 18;
  const caretRow = textarea.value
    .slice(0, textarea.selectionStart)
    .split("\n").length;
  const caretY = Math.max(0, caretRow - 1) * lineHeight;
  const visibleBottom = textarea.scrollTop + textarea.clientHeight;
  if (caretY + lineHeight > visibleBottom) {
    textarea.scrollTop = caretY + lineHeight - textarea.clientHeight;
  } else if (caretY < textarea.scrollTop) {
    textarea.scrollTop = Math.max(0, caretY);
  }
}

type InlineEditableProps = {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  as?: "span" | "strong";
  placeholder?: string;
  /** When false, single click selects (via onSelect) instead of opening the editor. */
  editOnClick?: boolean;
  onSelect?: () => void;
  /** Multi-line in-place editor (blur commits). */
  multiline?: boolean;
  /** When true with multiline: Enter commits, Shift+Enter adds a line. */
  enterCommits?: boolean;
  /** Delay before click opens editor when editOnClick is true (0 = immediate). */
  clickToEditDelay?: number;
  /** Fired when inline edit mode opens or closes. */
  onEditingChange?: (editing: boolean) => void;
  /** Render the active editor in a fixed overlay (above nested child nodes). */
  overlayWhileEditing?: boolean;
};

export function InlineEditable({
  value,
  onCommit,
  className = "",
  as: Tag = "span",
  placeholder,
  editOnClick = true,
  onSelect,
  multiline = false,
  enterCommits = false,
  clickToEditDelay = 220,
  onEditingChange,
  overlayWhileEditing = false,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [selectAllOnFocus, setSelectAllOnFocus] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useOverlay = overlayWhileEditing && editing;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editing) {
      return;
    }
    if (multiline) {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      if (selectAllOnFocus) {
        textarea.select();
      } else {
        const end = textarea.value.length;
        textarea.setSelectionRange(end, end);
      }
      resizeTextareaToContent(textarea);
      scrollTextareaCaretIntoView(textarea);
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (selectAllOnFocus) {
      input.select();
      return;
    }
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [editing, selectAllOnFocus, multiline, useOverlay]);

  useLayoutEffect(() => {
    if (!editing || !multiline || !textareaRef.current) {
      return;
    }
    resizeTextareaToContent(textareaRef.current);
  }, [draft, editing, multiline, useOverlay]);

  const beginEdit = (selectAll: boolean) => {
    setSelectAllOnFocus(selectAll);
    setDraft(value);
    setEditing(true);
    onEditingChange?.(true);
  };

  const commit = () => {
    onCommit(multiline ? draft : draft.trim());
    setEditing(false);
    onEditingChange?.(false);
  };

  const cancelEdit = () => {
    setDraft(value);
    setEditing(false);
    onEditingChange?.(false);
  };

  const cancelPendingClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

  const anchorLabel = draft || placeholder || "\u00a0";

  const renderAnchor = () => (
    <span
      ref={anchorRef}
      className={`inline-editable-anchor ${className}`.trim()}
      aria-hidden
      style={{
        visibility: "hidden",
        display: "inline-block",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        maxWidth: "100%",
      }}
    >
      {anchorLabel}
    </span>
  );

  if (editing) {
    const editorShell = multiline ? (
      <div
        className={`inline-editable-editor inline-editable-editor--multiline${useOverlay ? " inline-editable-editor--overlay" : ""} ${EDIT_FIELD_INTERACTION_CLASS}`}
        onPointerDown={blockCanvasPointer}
        onMouseDown={blockCanvasPointer}
      >
        <textarea
          ref={textareaRef}
          className={`inline-edit-textarea ${EDIT_FIELD_INTERACTION_CLASS} ${className}`}
          value={draft}
          rows={1}
          onChange={(event) => {
            setDraft(event.target.value);
            requestAnimationFrame(() => {
              const textarea = textareaRef.current;
              if (textarea) {
                resizeTextareaToContent(textarea);
                scrollTextareaCaretIntoView(textarea);
              }
            });
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              cancelEdit();
              event.stopPropagation();
              return;
            }
            if (event.key === "Enter" && enterCommits && !event.shiftKey) {
              event.preventDefault();
              commit();
              event.stopPropagation();
              return;
            }
            if (event.key === "Enter" && !enterCommits) {
              requestAnimationFrame(() => {
                const textarea = textareaRef.current;
                if (textarea) {
                  scrollTextareaCaretIntoView(textarea);
                }
              });
            }
            event.stopPropagation();
          }}
          onClick={blockCanvasPointer}
          onPointerDown={blockCanvasPointer}
          onMouseDown={blockCanvasPointer}
          onSelect={() => {
            const textarea = textareaRef.current;
            if (textarea) {
              scrollTextareaCaretIntoView(textarea);
            }
          }}
        />
      </div>
    ) : (
      <div
        className={`inline-editable-editor${useOverlay ? " inline-editable-editor--overlay" : ""} ${EDIT_FIELD_INTERACTION_CLASS}`}
        onPointerDown={blockCanvasPointer}
        onMouseDown={blockCanvasPointer}
      >
        <input
          ref={inputRef}
          className={`inline-edit-input ${EDIT_FIELD_INTERACTION_CLASS} ${className}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
            }
            if (e.key === "Escape") {
              cancelEdit();
            }
            e.stopPropagation();
          }}
          onClick={blockCanvasPointer}
          onPointerDown={blockCanvasPointer}
          onMouseDown={blockCanvasPointer}
        />
      </div>
    );

    if (useOverlay) {
      return (
        <>
          {renderAnchor()}
          <FloatingFieldPortal anchorRef={anchorRef} active>
            {editorShell}
          </FloatingFieldPortal>
        </>
      );
    }

    return editorShell;
  }

  const openEditOnPointerDown =
    editOnClick && clickToEditDelay <= 0 && !editing;

  return (
    <Tag
      className={`inline-editable ${className}`}
      onPointerDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        e.stopPropagation();
        onSelect?.();
        if (openEditOnPointerDown) {
          cancelPendingClick();
          beginEdit(false);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        cancelPendingClick();
        if (!editOnClick || clickToEditDelay <= 0) {
          return;
        }
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          beginEdit(false);
        }, clickToEditDelay);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        cancelPendingClick();
        beginEdit(true);
      }}
      title={
        multiline
          ? enterCommits
            ? "Click to edit · Enter to finish · Shift+Enter for new line"
            : "Click to edit · Enter for new line"
          : "Click to edit · double-click to select all"
      }
    >
      {value || placeholder ? (
        value ? (
          value
        ) : (
          <span className="inline-editable__placeholder">{placeholder}</span>
        )
      ) : null}
    </Tag>
  );
}
