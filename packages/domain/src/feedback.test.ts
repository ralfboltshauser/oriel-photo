import { describe, expect, it } from 'vitest';

import {
  createFeedbackIssueUrl,
  ORIEL_FEEDBACK_ISSUE_URL,
  ORIEL_FEEDBACK_TEMPLATE,
} from './feedback';

describe('feedback issue URL', () => {
  it('opens only Oriel’s issue form with structured prefilled fields', () => {
    const serialized = createFeedbackIssueUrl({
      title: '[Interface feedback] Export button',
      feedback: 'The label\u0000 should explain the destination.\u007f',
      target: 'ID: `topbar.export`\nElement: `button`',
      context: 'Workspace: Edit\nOriel: 0.1.0',
    });
    const url = new URL(serialized);

    expect(`${url.origin}${url.pathname}`).toBe(ORIEL_FEEDBACK_ISSUE_URL);
    expect(url.searchParams.get('template')).toBe(ORIEL_FEEDBACK_TEMPLATE);
    expect(url.searchParams.get('title')).toBe('[Interface feedback] Export button');
    expect(url.searchParams.get('feedback')).toBe('The label should explain the destination.');
    expect(url.searchParams.get('target')).toContain('topbar.export');
    expect(url.searchParams.get('context')).toContain('Workspace: Edit');
  });

  it('rejects malformed and oversized drafts instead of accepting arbitrary URLs', () => {
    expect(() => createFeedbackIssueUrl({ url: 'https://example.com' })).toThrow(
      'Feedback issue draft is invalid',
    );
    expect(() =>
      createFeedbackIssueUrl({
        title: 'Feedback',
        feedback: '🙂'.repeat(600),
        target: '🙂'.repeat(500),
        context: 'Workspace: Library',
      }),
    ).toThrow('safe GitHub draft URL');
  });
});
