import { IconButton, Kbd } from '@oriel/ui';
import { MousePointer2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';

import { createFeedbackIssueUrl } from '@oriel/domain';

import { desktopBridge } from '../../lib/bridge';
import { useCatalogStore } from '../../store/catalog-store';
import {
  getKeyboardFeedbackTargets,
  isFeedbackElementVisible,
  resolveFeedbackElement,
  snapshotFeedbackTarget,
  type FeedbackTargetSnapshot,
} from './element-context';
import {
  FeedbackComposer,
  type FeedbackComposerStage,
  type FeedbackSelectionMethod,
} from './FeedbackComposer';
import { useFeedbackModeStore } from './feedback-store';

interface HoveredTarget {
  element: HTMLElement;
  snapshot: FeedbackTargetSnapshot;
}

type ComposerStage = 'targeting' | FeedbackComposerStage;

function highlightStyle(target: FeedbackTargetSnapshot): CSSProperties {
  return {
    height: target.bounds.height,
    left: target.bounds.x,
    top: target.bounds.y,
    width: target.bounds.width,
  };
}

function targetDetails(target: FeedbackTargetSnapshot): string {
  return [
    `Semantic ID: ${target.id}`,
    `Selector: ${target.selector}`,
    `Component trail: ${target.trail.join(' > ') || 'Unregistered element'}`,
    `Element: ${target.tag} (${target.role})`,
  ].join('\n');
}

export function FeedbackOverlay() {
  const active = useFeedbackModeStore((state) => state.active);
  const setActive = useFeedbackModeStore((state) => state.setActive);
  const catalog = useCatalogStore((state) => state.catalog);
  const [hovered, setHovered] = useState<HoveredTarget | null>(null);
  const [selected, setSelected] = useState<FeedbackTargetSnapshot | null>(null);
  const [stage, setStage] = useState<ComposerStage>('targeting');
  const [draft, setDraft] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [selectionMethod, setSelectionMethod] = useState<FeedbackSelectionMethod>('pointer');
  const [announcement, setAnnouncement] = useState('');
  const hoveredRef = useRef<HoveredTarget | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef(0);
  const geometryFrameRef = useRef(0);
  const requestRef = useRef(0);

  const resetSelection = useCallback(() => {
    requestRef.current += 1;
    selectedElementRef.current = null;
    setSelected(null);
    setDraft('');
    setError(null);
    setOpening(false);
    setSelectionMethod('pointer');
    setAnnouncement('');
    setStage('targeting');
  }, []);

  const exit = useCallback(() => {
    resetSelection();
    setHovered(null);
    setActive(false);
  }, [resetSelection, setActive]);

  const selectElement = useCallback((element: HTMLElement, method: FeedbackSelectionMethod) => {
    const snapshot = snapshotFeedbackTarget(element);
    selectedElementRef.current = element;
    setSelected(snapshot);
    setDraft('');
    setError(null);
    setSelectionMethod(method);
    setAnnouncement('');
    setStage('composing');
  }, []);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    if (!active) {
      document.body.removeAttribute('data-feedback-mode');
      resetSelection();
      setHovered(null);
      return;
    }
    document.body.setAttribute('data-feedback-mode', 'true');
    void desktopBridge
      .getDiagnostics()
      .then(setDiagnostics)
      .catch(() => setDiagnostics({ platform: desktopBridge.platform }));
    return () => document.body.removeAttribute('data-feedback-mode');
  }, [active, resetSelection]);

  useEffect(() => {
    if (!active || stage !== 'targeting') return undefined;

    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setAnnouncement('');
        const element = resolveFeedbackElement(event.target);
        if (!element || !isFeedbackElementVisible(element)) {
          if (hoveredRef.current) setHovered(null);
          return;
        }
        if (hoveredRef.current?.element === element) return;
        setHovered({ element, snapshot: snapshotFeedbackTarget(element) });
      });
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!resolveFeedbackElement(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onClick = (event: MouseEvent) => {
      const element = resolveFeedbackElement(event.target);
      if (!element) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(element, 'pointer');
    };
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      cancelAnimationFrame(frameRef.current);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, selectElement, stage]);

  useEffect(() => {
    if (!active) return undefined;
    const refreshGeometry = () => {
      cancelAnimationFrame(geometryFrameRef.current);
      geometryFrameRef.current = requestAnimationFrame(() => {
        const currentHovered = hoveredRef.current;
        if (currentHovered) {
          if (isFeedbackElementVisible(currentHovered.element)) {
            setHovered({
              element: currentHovered.element,
              snapshot: snapshotFeedbackTarget(currentHovered.element),
            });
          } else {
            setHovered(null);
          }
        }
        const selectedElement = selectedElementRef.current;
        if (selectedElement && isFeedbackElementVisible(selectedElement)) {
          setSelected(snapshotFeedbackTarget(selectedElement));
        }
      });
    };
    window.addEventListener('resize', refreshGeometry);
    document.addEventListener('scroll', refreshGeometry, true);
    return () => {
      cancelAnimationFrame(geometryFrameRef.current);
      window.removeEventListener('resize', refreshGeometry);
      document.removeEventListener('scroll', refreshGeometry, true);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (stage !== 'targeting') {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          resetSelection();
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        exit();
        return;
      }
      const direction =
        event.key === 'Tab'
          ? event.shiftKey
            ? -1
            : 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? -1
              : 0;
      if (direction !== 0) {
        event.preventDefault();
        event.stopPropagation();
        const targets = getKeyboardFeedbackTargets();
        if (targets.length === 0) return;
        const current = hoveredRef.current?.element;
        const currentIndex = current ? targets.indexOf(current) : -1;
        const nextIndex =
          currentIndex < 0
            ? direction > 0
              ? 0
              : targets.length - 1
            : (currentIndex + direction + targets.length) % targets.length;
        const element = targets[nextIndex]!;
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const snapshot = snapshotFeedbackTarget(element);
        setHovered({ element, snapshot });
        setAnnouncement(`${snapshot.label} highlighted. Press Enter to add feedback.`);
      } else if (event.key === 'Enter') {
        const element = hoveredRef.current?.element ?? getKeyboardFeedbackTargets()[0];
        if (!element) return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(element, 'keyboard');
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, exit, resetSelection, selectElement, stage]);

  const context = useMemo(() => {
    if (!selected) return '';
    const lines = [
      `Workspace: ${catalog.workspace}`,
      `View: ${catalog.viewMode}`,
      `Oriel version: ${diagnostics.appVersion ?? 'unknown'}`,
      `Platform: ${diagnostics.platform ?? desktopBridge.platform}`,
      `Viewport: ${window.innerWidth} × ${window.innerHeight}`,
      `Bounds: ${selected.bounds.width} × ${selected.bounds.height} at ${selected.bounds.x}, ${selected.bounds.y}`,
      'Privacy: no photo, filename, path, EXIF, catalog content, or screenshot is attached.',
    ];
    return lines.join('\n');
  }, [catalog.viewMode, catalog.workspace, diagnostics, selected]);

  const reviewOnGitHub = useCallback(async () => {
    if (!selected || !draft.trim()) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    const issueDraft = {
      title: `[Interface feedback] ${selected.label}`,
      feedback: draft,
      target: targetDetails(selected),
      context: includeContext ? context : '',
    };
    setError(null);
    setOpening(true);
    try {
      createFeedbackIssueUrl(issueDraft);
      await desktopBridge.openFeedbackIssue(issueDraft);
      if (requestRef.current !== request) return;
      setStage('opened');
      toast.success('GitHub draft opened');
    } catch (cause) {
      if (requestRef.current === request) {
        setError(cause instanceof Error ? cause.message : 'Could not open the GitHub draft');
      }
    } finally {
      if (requestRef.current === request) setOpening(false);
    }
  }, [context, draft, includeContext, selected]);

  if (!active) return null;
  const highlight = selected ?? hovered?.snapshot ?? null;

  return (
    <>
      {highlight ? (
        <div
          aria-hidden="true"
          className="feedback-highlight"
          data-feedback-selected={Boolean(selected)}
          data-feedback-ui
          style={highlightStyle(highlight)}
        >
          {!selected ? <span>{highlight.label}</span> : null}
        </div>
      ) : null}

      <div aria-live="polite" className="feedback-mode-hud" data-feedback-ui role="status">
        <span className="feedback-mode-icon">
          <MousePointer2 size={13} />
        </span>
        <span>
          <strong>Feedback mode</strong>
          <small>{stage === 'targeting' ? 'Point at anything' : 'Target locked'}</small>
        </span>
        <Kbd>↑↓</Kbd>
        <small>Choose</small>
        <Kbd>Esc</Kbd>
        <small>{stage === 'targeting' ? 'Exit' : 'Back'}</small>
        <IconButton label="Exit feedback mode" onClick={exit}>
          <X size={14} />
        </IconButton>
        <span className="sr-only">{announcement}</span>
      </div>

      {selected && stage !== 'targeting' ? (
        <FeedbackComposer
          context={context}
          draft={draft}
          error={error}
          includeContext={includeContext}
          onDraftChange={setDraft}
          onExit={exit}
          onIncludeContextChange={setIncludeContext}
          onReset={resetSelection}
          onReview={reviewOnGitHub}
          opening={opening}
          selected={selected}
          selectionMethod={selectionMethod}
          stage={stage}
          targetDetails={targetDetails(selected)}
        />
      ) : null}
    </>
  );
}
