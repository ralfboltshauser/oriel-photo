import type { FeedbackIssueDraft } from './types';

export const ORIEL_FEEDBACK_ISSUE_URL =
  'https://github.com/ralfboltshauser/oriel-photo/issues/new';
export const ORIEL_FEEDBACK_TEMPLATE = 'interface-feedback.yml';
export const MAX_FEEDBACK_LENGTH = 1_200;
export const MAX_FEEDBACK_URL_LENGTH = 7_500;

const MAX_TITLE_LENGTH = 140;
const MAX_TARGET_LENGTH = 1_000;
const MAX_CONTEXT_LENGTH = 2_400;

function clean(value: string, maximum: number, multiline: boolean): string {
  if (typeof value !== 'string') throw new Error('Feedback issue fields must be text');
  const withoutControls = [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      const isControl = code < 32 || (code >= 127 && code <= 159);
      return !isControl || (multiline && (character === '\n' || character === '\t'));
    })
    .join('')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (withoutControls.length > maximum) {
    throw new Error(`Feedback issue field exceeds ${maximum.toLocaleString()} characters`);
  }
  return multiline ? withoutControls : withoutControls.replace(/\s+/g, ' ');
}

function isFeedbackIssueDraft(value: unknown): value is FeedbackIssueDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<FeedbackIssueDraft>;
  return (
    typeof draft.title === 'string' &&
    typeof draft.feedback === 'string' &&
    typeof draft.target === 'string' &&
    typeof draft.context === 'string'
  );
}

export function createFeedbackIssueUrl(value: unknown): string {
  if (!isFeedbackIssueDraft(value)) throw new Error('Feedback issue draft is invalid');

  const title = clean(value.title, MAX_TITLE_LENGTH, false);
  const feedback = clean(value.feedback, MAX_FEEDBACK_LENGTH, true);
  const target = clean(value.target, MAX_TARGET_LENGTH, true);
  const context = clean(value.context, MAX_CONTEXT_LENGTH, true);
  if (!feedback) throw new Error('Describe the feedback before opening GitHub');
  if (!target) throw new Error('Choose an interface element before opening GitHub');

  const url = new URL(ORIEL_FEEDBACK_ISSUE_URL);
  url.searchParams.set('template', ORIEL_FEEDBACK_TEMPLATE);
  url.searchParams.set('title', title || '[Interface feedback] Oriel interface');
  url.searchParams.set('feedback', feedback);
  url.searchParams.set('target', target);
  if (context) url.searchParams.set('context', context);

  const serialized = url.toString();
  if (serialized.length > MAX_FEEDBACK_URL_LENGTH) {
    throw new Error('This feedback is too long for a safe GitHub draft URL. Shorten the note.');
  }
  return serialized;
}
