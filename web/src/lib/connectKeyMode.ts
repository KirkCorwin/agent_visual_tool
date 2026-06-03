export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export const CONNECT_KEY = "c";

export function isConnectKey(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === CONNECT_KEY;
}
