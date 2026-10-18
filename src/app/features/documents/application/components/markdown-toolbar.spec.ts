import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { byTestId, testIdText } from '../../test-utils/by-test-id';
import { settle } from '../../test-utils/settle';
import { MarkdownEditor } from './markdown-editor';
import { MarkdownToolbar } from './markdown-toolbar';

@Component({
  imports: [MarkdownToolbar, MarkdownEditor],
  template: `
    <app-markdown-toolbar [editor]="editor" />
    <textarea
      id="markdown-zone"
      data-testid="markdown"
      appMarkdownEditor
      #editor="markdownEditor"
    ></textarea>
  `,
})
class ToolbarHost {}

type Rendered = {
  readonly fixture: ComponentFixture<ToolbarHost>;
  readonly host: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly textarea: HTMLTextAreaElement;
  readonly inputs: Event[];
};

async function renderToolbar(text = '', start = 0, end = start): Promise<Rendered> {
  const fixture = TestBed.createComponent(ToolbarHost);
  await settle(fixture);
  const host = fixture.nativeElement as HTMLElement;
  const textarea = byTestId(host, 'markdown') as HTMLTextAreaElement;
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  textarea.setSelectionRange(start, end);
  textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
  await settle(fixture);
  const inputs: Event[] = [];
  textarea.addEventListener('input', (event) => inputs.push(event));
  const toolbar = byTestId(host, 'markdown-toolbar') ?? host;
  return { fixture, host, toolbar, textarea, inputs };
}

const items = (toolbar: HTMLElement): readonly HTMLElement[] => [
  ...toolbar.querySelectorAll<HTMLElement>('button, select'),
];

const tabbable = (toolbar: HTMLElement): readonly (string | null)[] =>
  items(toolbar).map((item) => item.getAttribute('tabindex'));

const onlyTabbable = (toolbar: HTMLElement, index: number): readonly string[] =>
  items(toolbar).map((_, position) => (position === index ? '0' : '-1'));

const keydown = (target: HTMLElement, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const blockSelect = (host: HTMLElement): HTMLSelectElement | null => {
  const element = byTestId(host, 'markdown-block-level');
  return element instanceof HTMLSelectElement ? element : null;
};

async function click(rendered: Rendered, testId: string): Promise<void> {
  byTestId(rendered.toolbar, testId)?.click();
  await settle(rendered.fixture);
}

describe('MarkdownToolbar: structure', () => {
  it('Given the toolbar When it renders Then it is a named toolbar that controls the Markdown zone', async () => {
    // Given / When
    const { toolbar, host } = await renderToolbar();

    // Then
    expect({
      found: toolbar !== host,
      role: toolbar.getAttribute('role'),
      name: toolbar.getAttribute('aria-label'),
      controls: toolbar.getAttribute('aria-controls'),
    }).toEqual({
      found: true,
      role: 'toolbar',
      name: 'Mise en forme du document',
      controls: 'markdown-zone',
    });
  });

  it('Given the toolbar When it renders Then every tool is a named button with its shortcut and sprite icon, and no image tool', async () => {
    // Given / When
    const { toolbar } = await renderToolbar();

    // Then
    const tools = [...toolbar.querySelectorAll('button')].map((button) => ({
      name: button.getAttribute('aria-label'),
      type: button.getAttribute('type'),
      shortcut: button.getAttribute('aria-keyshortcuts'),
      icon: button.querySelector('use')?.getAttribute('href'),
    }));
    expect(tools).toEqual([
      {
        name: 'Gras',
        type: 'button',
        shortcut: 'Control+B Meta+B',
        icon: '/icons/sprite.svg#lucide-bold',
      },
      {
        name: 'Italique',
        type: 'button',
        shortcut: 'Control+I Meta+I',
        icon: '/icons/sprite.svg#lucide-italic',
      },
      {
        name: 'Souligné',
        type: 'button',
        shortcut: 'Control+U Meta+U',
        icon: '/icons/sprite.svg#lucide-underline',
      },
      {
        name: 'Barré',
        type: 'button',
        shortcut: null,
        icon: '/icons/sprite.svg#lucide-strikethrough',
      },
      {
        name: 'Code en ligne',
        type: 'button',
        shortcut: 'Control+E Meta+E',
        icon: '/icons/sprite.svg#lucide-code',
      },
      {
        name: 'Lien',
        type: 'button',
        shortcut: 'Control+K Meta+K',
        icon: '/icons/sprite.svg#lucide-link',
      },
      {
        name: 'Liste à puces',
        type: 'button',
        shortcut: null,
        icon: '/icons/sprite.svg#lucide-list',
      },
      {
        name: 'Liste numérotée',
        type: 'button',
        shortcut: null,
        icon: '/icons/sprite.svg#lucide-list-ordered',
      },
      {
        name: 'Citation',
        type: 'button',
        shortcut: null,
        icon: '/icons/sprite.svg#lucide-text-quote',
      },
      {
        name: 'Séparateur',
        type: 'button',
        shortcut: null,
        icon: '/icons/sprite.svg#lucide-minus',
      },
    ]);
  });

  it('Given the toolbar When it renders Then its live status region is present and empty', async () => {
    // Given / When
    const { host } = await renderToolbar();

    // Then
    expect({
      role: byTestId(host, 'markdown-toolbar-status')?.getAttribute('role'),
      text: testIdText(host, 'markdown-toolbar-status'),
    }).toEqual({ role: 'status', text: '' });
  });
});

describe('MarkdownToolbar: focus itinérant', () => {
  it('Given the toolbar When it renders Then only its first control is reachable with Tab', async () => {
    // Given / When
    const { toolbar } = await renderToolbar();

    // Then
    expect(tabbable(toolbar)).toEqual(onlyTabbable(toolbar, 0));
  });

  it.each([
    { from: 'first', key: 'ArrowRight', to: 'second' },
    { from: 'second', key: 'ArrowLeft', to: 'first' },
    { from: 'first', key: 'ArrowLeft', to: 'last' },
    { from: 'last', key: 'ArrowRight', to: 'first' },
    { from: 'second', key: 'Home', to: 'first' },
    { from: 'first', key: 'End', to: 'last' },
  ] as const)(
    'Given the focus on the $from control When $key is pressed Then the $to control takes the focus and becomes the only tabbable one',
    async ({ from, key, to }) => {
      // Given
      const { toolbar, fixture } = await renderToolbar();
      const count = items(toolbar).length;
      const index = { first: 0, second: 1, last: count - 1 };
      items(toolbar)[index[from]]?.focus();
      await settle(fixture);

      // When
      const event = keydown(items(toolbar)[index[from]] ?? toolbar, key);
      await settle(fixture);

      // Then
      expect({
        focused: items(toolbar).indexOf(document.activeElement as HTMLElement),
        tabbable: tabbable(toolbar),
        prevented: event.defaultPrevented,
      }).toEqual({
        focused: index[to],
        tabbable: onlyTabbable(toolbar, index[to]),
        prevented: true,
      });
    },
  );
});

describe('MarkdownToolbar: mise en forme', () => {
  it.each([
    { testId: 'markdown-tool-bold', value: 'un **mot** ici', selection: [5, 8] },
    { testId: 'markdown-tool-italic', value: 'un *mot* ici', selection: [4, 7] },
    { testId: 'markdown-tool-underline', value: 'un <u>mot</u> ici', selection: [6, 9] },
    { testId: 'markdown-tool-strikethrough', value: 'un ~~mot~~ ici', selection: [5, 8] },
    { testId: 'markdown-tool-inline-code', value: 'un `mot` ici', selection: [4, 7] },
  ])(
    'Given a word selected When $testId is clicked Then the zone is formatted, the word stays selected and the focus is back in the zone',
    async ({ testId, value, selection }) => {
      // Given
      const rendered = await renderToolbar('un mot ici', 3, 6);

      // When
      await click(rendered, testId);

      // Then
      expect({
        value: rendered.textarea.value,
        selection: [rendered.textarea.selectionStart, rendered.textarea.selectionEnd],
        focused: document.activeElement === rendered.textarea,
        inputs: rendered.inputs.length,
      }).toEqual({ value, selection, focused: true, inputs: 1 });
    },
  );

  it('Given a word selected When « Gras » is clicked twice Then the status tells it was applied, then removed', async () => {
    // Given
    const rendered = await renderToolbar('un mot ici', 3, 6);

    // When
    await click(rendered, 'markdown-tool-bold');
    const applied = testIdText(rendered.host, 'markdown-toolbar-status');
    await click(rendered, 'markdown-tool-bold');

    // Then
    expect({
      applied,
      removed: testIdText(rendered.host, 'markdown-toolbar-status'),
      value: rendered.textarea.value,
    }).toEqual({ applied: 'Gras appliqué', removed: 'Gras retiré', value: 'un mot ici' });
  });

  it.each([
    { testId: 'markdown-tool-bullet-list', value: '- un mot ici' },
    { testId: 'markdown-tool-ordered-list', value: '1. un mot ici' },
    { testId: 'markdown-tool-quote', value: '> un mot ici' },
    { testId: 'markdown-tool-rule', value: 'un mot ici\n\n---' },
  ])(
    'Given the caret When $testId is clicked Then the zone reads $value',
    async ({ testId, value }) => {
      // Given
      const rendered = await renderToolbar('un mot ici', 10);

      // When
      await click(rendered, testId);

      // Then
      expect(rendered.textarea.value).toBe(value);
    },
  );
});

describe('MarkdownToolbar: niveau de bloc', () => {
  it.each([
    { text: '## Titre\n\nTexte', caret: 3, value: 'h2' },
    { text: '## Titre\n\nTexte', caret: 12, value: 'paragraph' },
    { text: 'Texte\n#### Sous', caret: 10, value: 'h4' },
    { text: '# Grand', caret: 7, value: '' },
  ])(
    'Given the caret at $caret in $text When the caret settles Then the select reads $value',
    async ({ text, caret, value }) => {
      // Given / When
      const { host } = await renderToolbar(text, caret);

      // Then
      expect(blockSelect(host)?.value).toBe(value);
    },
  );

  it('Given the caret in a paragraph When « Titre 3 » is chosen Then the line becomes a level-3 title and the select keeps the focus', async () => {
    // Given
    const rendered = await renderToolbar('Texte\n\nSuite', 2);
    const select = blockSelect(rendered.host);
    select?.focus();

    // When
    if (select) select.value = 'h3';
    select?.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(rendered.fixture);

    // Then
    expect({
      value: rendered.textarea.value,
      select: blockSelect(rendered.host)?.value,
      focused: document.activeElement === select,
      inputs: rendered.inputs.length,
    }).toEqual({ value: '### Texte\n\nSuite', select: 'h3', focused: true, inputs: 1 });
  });
});
