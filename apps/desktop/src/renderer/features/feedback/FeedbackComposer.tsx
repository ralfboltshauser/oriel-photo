import * as Dialog from '@radix-ui/react-dialog';
import { MAX_FEEDBACK_LENGTH } from '@oriel/domain';
import { Button, IconButton } from '@oriel/ui';
import { CheckCircle2, ExternalLink, MessageSquarePlus, X } from 'lucide-react';
import { useRef, type CSSProperties, type FormEvent } from 'react';

import type { FeedbackTargetSnapshot } from './element-context';

export type FeedbackComposerStage = 'composing' | 'opened';
export type FeedbackSelectionMethod = 'keyboard' | 'pointer';

interface FeedbackComposerProps {
  context: string;
  draft: string;
  error: string | null;
  includeContext: boolean;
  opening: boolean;
  selected: FeedbackTargetSnapshot;
  selectionMethod: FeedbackSelectionMethod;
  stage: FeedbackComposerStage;
  targetDetails: string;
  onDraftChange: (value: string) => void;
  onExit: () => void;
  onIncludeContextChange: (include: boolean) => void;
  onReset: () => void;
  onReview: () => Promise<void>;
}

function composerStyle(target: FeedbackTargetSnapshot): CSSProperties {
  const width = Math.min(380, window.innerWidth - 24);
  const gap = 12;
  const right = target.bounds.x + target.bounds.width;
  let left = right + gap;
  if (left + width > window.innerWidth - 12) left = target.bounds.x - width - gap;
  if (left < 12) left = Math.min(12, window.innerWidth - width - 12);
  const top = Math.max(58, Math.min(target.bounds.y, window.innerHeight - 520));
  return { left, top, width };
}

export function FeedbackComposer({
  context,
  draft,
  error,
  includeContext,
  opening,
  selected,
  selectionMethod,
  stage,
  targetDetails,
  onDraftChange,
  onExit,
  onIncludeContextChange,
  onReset,
  onReview,
}: FeedbackComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onReview();
  };

  return (
    <Dialog.Root
      modal
      onOpenChange={(open) => {
        if (!open) onReset();
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="feedback-dialog-overlay" data-feedback-ui />
        <Dialog.Content
          aria-describedby="feedback-dialog-description"
          className="feedback-composer"
          data-input-method={selectionMethod}
          data-feedback-ui
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onReset();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (stage === 'composing') textareaRef.current?.focus();
          }}
          style={composerStyle(selected)}
        >
          {stage === 'opened' ? (
            <div className="feedback-opened">
              <span className="feedback-success-icon">
                <CheckCircle2 size={18} />
              </span>
              <Dialog.Title>GitHub draft opened</Dialog.Title>
              <Dialog.Description id="feedback-dialog-description">
                Review it in your browser. No issue exists until you press “Submit new issue.”
              </Dialog.Description>
              <div className="feedback-actions feedback-actions-stacked">
                <Button
                  disabled={opening}
                  icon={<ExternalLink size={13} />}
                  onClick={() => void onReview()}
                >
                  {opening ? 'Opening…' : 'Open again'}
                </Button>
                <Button onClick={onReset} variant="ghost">
                  Annotate another
                </Button>
                <Button onClick={onExit} variant="ghost">
                  Exit feedback
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <header className="feedback-heading">
                <span className="feedback-heading-icon">
                  <MessageSquarePlus size={15} />
                </span>
                <span>
                  <Dialog.Title>Feedback on {selected.label}</Dialog.Title>
                  <Dialog.Description id="feedback-dialog-description">
                    One specific observation works best.
                  </Dialog.Description>
                </span>
                <Dialog.Close asChild>
                  <IconButton label="Cancel feedback">
                    <X size={14} />
                  </IconButton>
                </Dialog.Close>
              </header>

              <label className="feedback-field" htmlFor="oriel-feedback-note">
                <span>What should change?</span>
                <textarea
                  id="oriel-feedback-note"
                  maxLength={MAX_FEEDBACK_LENGTH}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder="What happened, and what did you expect instead?"
                  ref={textareaRef}
                  rows={5}
                  value={draft}
                />
                <small>
                  {draft.length.toLocaleString()} / {MAX_FEEDBACK_LENGTH.toLocaleString()}
                </small>
              </label>

              <div className="feedback-target-card">
                <span>Selected interface target</span>
                <strong>{selected.id}</strong>
                <code>{selected.selector}</code>
              </div>

              <details className="feedback-context">
                <summary>Review captured context</summary>
                <pre>
                  {targetDetails}
                  {includeContext ? `\n${context}` : ''}
                </pre>
              </details>

              <label className="feedback-context-toggle">
                <input
                  checked={includeContext}
                  onChange={(event) => onIncludeContextChange(event.target.checked)}
                  type="checkbox"
                />
                Include app version, OS, workspace, viewport, and bounds
              </label>

              <p className="feedback-privacy-note">
                Opening sends these fields to GitHub in the draft URL, which your browser may
                retain in history. No public issue exists until you submit it there. Oriel never
                handles your GitHub credentials or attaches photo data.
              </p>
              {error ? (
                <p className="feedback-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="feedback-actions">
                <Button onClick={onReset} variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={!draft.trim() || opening}
                  icon={<ExternalLink size={13} />}
                  type="submit"
                  variant="primary"
                >
                  {opening ? 'Opening…' : 'Review on GitHub'}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
