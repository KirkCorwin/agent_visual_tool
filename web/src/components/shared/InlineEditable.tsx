import { useEffect, useRef, useState } from "react";

/** Only on the active text field — not the whole node — so the card can still be dragged elsewhere. */
const EDIT_FIELD_INTERACTION_CLASS = "nodrag nopan";

const blockCanvasPointer = (event: React.PointerEvent | React.MouseEvent) => {
  event.stopPropagation();
};

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
  /** Multi-line in-place editor (Enter adds a line; blur commits). */
  multiline?: boolean;
  /** Delay before click opens editor when editOnClick is true (0 = immediate). */
  clickToEditDelay?: number;
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
  clickToEditDelay = 220,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [selectAllOnFocus, setSelectAllOnFocus] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [editing, selectAllOnFocus, multiline]);

  const beginEdit = (selectAll: boolean) => {
    setSelectAllOnFocus(selectAll);
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    onCommit(multiline ? draft : draft.trim());
    setEditing(false);
  };

  const cancelPendingClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <div
          className={`inline-editable-editor inline-editable-editor--multiline ${EDIT_FIELD_INTERACTION_CLASS}`}
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
                  scrollTextareaCaretIntoView(textarea);
                }
              });
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
              if (event.key === "Enter") {
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
      );
    }

    return (
      <div
        className={`inline-editable-editor ${EDIT_FIELD_INTERACTION_CLASS}`}
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
              setDraft(value);
              setEditing(false);
            }
            e.stopPropagation();
          }}
          onClick={blockCanvasPointer}
          onPointerDown={blockCanvasPointer}
          onMouseDown={blockCanvasPointer}
        />
      </div>
    );
  }

  return (
    <Tag
      className={`inline-editable ${className}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        cancelPendingClick();
        if (!editOnClick) {
          return;
        }
        if (clickToEditDelay <= 0) {
          beginEdit(false);
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
          ? "Click to edit · Enter for new line"
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
