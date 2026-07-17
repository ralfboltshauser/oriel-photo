// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { resolveFeedbackElement, snapshotFeedbackTarget } from './element-context';

afterEach(() => {
  document.body.replaceChildren();
});

describe('feedback element context', () => {
  it('uses authored semantic IDs without leaking photo filenames or DOM copy', () => {
    document.body.innerHTML = `
      <main data-feedback="app.shell">
        <div data-feedback="library.grid">
          <div aria-label="private-client-portrait.jpg" data-feedback="library.photo" role="gridcell">
            <img alt="" src="private.jpg" />
            <span>private-client-portrait.jpg</span>
          </div>
        </div>
      </main>
    `;
    const image = document.querySelector('img');
    const element = resolveFeedbackElement(image);
    expect(element).not.toBeNull();

    const snapshot = snapshotFeedbackTarget(element!);
    expect(snapshot.id).toBe('library.photo');
    expect(snapshot.selector).toBe('[data-feedback="library.photo"]');
    expect(snapshot.trail).toEqual(['app.shell', 'library.grid', 'library.photo']);
    expect(JSON.stringify(snapshot)).not.toContain('private-client-portrait');
  });

  it('falls back to safe structural context and ignores the feedback interface itself', () => {
    document.body.innerHTML = `
      <button aria-label="ORL_0042.jpg" class="private-client-name" role="client-secret">Export</button>
      <div data-feedback-ui><button data-feedback="unsafe.control">Close</button></div>
    `;
    const button = document.querySelector('button');
    const fallback = snapshotFeedbackTarget(resolveFeedbackElement(button)!);
    expect(fallback.id).toBe('unregistered.button');
    expect(fallback.selector).toBe('button');
    expect(fallback.role).toBe('button');
    expect(JSON.stringify(fallback)).not.toContain('ORL_0042');
    expect(JSON.stringify(fallback)).not.toContain('client-secret');
    expect(JSON.stringify(fallback)).not.toContain('private-client-name');
    expect(
      resolveFeedbackElement(document.querySelector('[data-feedback-ui] button')),
    ).toBeNull();
  });

  it('resolves a nested control to its nearby authored product target', () => {
    document.body.innerHTML = `
      <section data-feedback="edit.section.light">
        <div data-feedback="edit.exposure">
          <header><input aria-label="Exposure value" value="0.00" /></header>
        </div>
      </section>
    `;
    const input = document.querySelector('input');
    const element = resolveFeedbackElement(input);

    expect(element?.getAttribute('data-feedback')).toBe('edit.exposure');
    expect(snapshotFeedbackTarget(element!).id).toBe('edit.exposure');
  });
});
