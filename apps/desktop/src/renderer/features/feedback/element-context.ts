export interface FeedbackTargetSnapshot {
  id: string;
  label: string;
  selector: string;
  trail: string[];
  tag: string;
  role: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="slider"], [role="gridcell"], [role="option"], [role="menuitem"], [role="tab"]';
const SAFE_ID = /^[a-z][a-z0-9._-]{0,79}$/;
const SAFE_ROLES = new Set([
  'banner',
  'button',
  'checkbox',
  'combobox',
  'complementary',
  'dialog',
  'gridcell',
  'link',
  'listbox',
  'main',
  'menuitem',
  'navigation',
  'option',
  'radio',
  'region',
  'slider',
  'switch',
  'tab',
  'textbox',
]);

function feedbackId(element: Element): string | null {
  const value = element.getAttribute('data-feedback');
  return value && SAFE_ID.test(value) ? value : null;
}

function semanticRole(element: HTMLElement): string {
  const explicit = element
    .getAttribute('role')
    ?.split(/\s+/)
    .find((role) => SAFE_ROLES.has(role));
  if (explicit) return explicit;
  const roles: Record<string, string> = {
    A: 'link',
    BUTTON: 'button',
    INPUT: 'input',
    SELECT: 'select',
    TEXTAREA: 'textbox',
    ASIDE: 'complementary',
    HEADER: 'banner',
    MAIN: 'main',
    NAV: 'navigation',
  };
  return roles[element.tagName] ?? 'region';
}

function titleFromId(value: string): string {
  const leaf = value.split('.').at(-1) ?? value;
  return leaf
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function fallbackSelector(element: HTMLElement): string {
  return element.tagName.toLowerCase();
}

function nearbyAuthoredTarget(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  for (let depth = 0; current && depth <= 2; depth += 1) {
    if (feedbackId(current)) return current;
    current = current.parentElement;
  }
  return null;
}

export function isFeedbackElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function resolveFeedbackElement(target: EventTarget | null): HTMLElement | null {
  const origin =
    target instanceof HTMLElement
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!origin || origin.closest('[data-feedback-ui]')) return null;
  const interactive = origin.closest<HTMLElement>(INTERACTIVE_SELECTOR) ?? origin;
  const candidate = nearbyAuthoredTarget(interactive) ?? interactive;
  if (
    candidate === document.body ||
    candidate === document.documentElement ||
    candidate.id === 'root' ||
    candidate.closest('[data-feedback-ui]')
  ) {
    return null;
  }
  return candidate;
}

export function snapshotFeedbackTarget(element: HTMLElement): FeedbackTargetSnapshot {
  const authoredId = feedbackId(element);
  const role = semanticRole(element);
  const tag = element.tagName.toLowerCase();
  const rect = element.getBoundingClientRect();
  const trail: string[] = [];
  let current: Element | null = element;
  while (current) {
    const id = feedbackId(current);
    if (id && trail[0] !== id) trail.unshift(id);
    current = current.parentElement;
  }
  const id = authoredId ?? `unregistered.${role}`;
  return {
    id,
    label: authoredId ? titleFromId(authoredId) : titleFromId(role),
    selector: authoredId ? `[data-feedback="${authoredId}"]` : fallbackSelector(element),
    trail,
    tag,
    role,
    bounds: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

export function getKeyboardFeedbackTargets(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-feedback]')].filter(
    (element) => !element.closest('[data-feedback-ui]') && isFeedbackElementVisible(element),
  );
}
