import type { InlineFormat, LinePrefix, MarkdownAction } from './markdown-edit';

type ToolbarTool = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly key: string | null;
  readonly action: MarkdownAction;
  readonly applied: string;
  readonly removed: string;
};

const inline = (
  format: InlineFormat,
  label: string,
  icon: string,
  key: string | null,
): ToolbarTool => ({
  id: format,
  label,
  icon,
  key,
  action: { kind: 'inline', format },
  applied: `${label} appliqué`,
  removed: `${label} retiré`,
});

const linePrefix = (prefix: LinePrefix, label: string, icon: string): ToolbarTool => ({
  id: prefix,
  label,
  icon,
  key: null,
  action: { kind: 'line-prefix', prefix },
  applied: `${label} appliquée`,
  removed: `${label} retirée`,
});

const insertion = (
  id: 'link' | 'rule',
  label: string,
  icon: string,
  key: string | null,
  inserted: string,
): ToolbarTool => ({
  id,
  label,
  icon,
  key,
  action: { kind: id },
  applied: inserted,
  removed: inserted,
});

export const TOOLBAR_TOOLS: readonly ToolbarTool[] = [
  inline('bold', 'Gras', 'lucide-bold', 'b'),
  inline('italic', 'Italique', 'lucide-italic', 'i'),
  inline('underline', 'Souligné', 'lucide-underline', 'u'),
  inline('strikethrough', 'Barré', 'lucide-strikethrough', null),
  inline('inline-code', 'Code en ligne', 'lucide-code', 'e'),
  insertion('link', 'Lien', 'lucide-link', 'k', 'Lien inséré'),
  linePrefix('bullet-list', 'Liste à puces', 'lucide-list'),
  linePrefix('ordered-list', 'Liste numérotée', 'lucide-list-ordered'),
  linePrefix('quote', 'Citation', 'lucide-text-quote'),
  insertion('rule', 'Séparateur', 'lucide-minus', null, 'Séparateur inséré'),
];

export function toolbarToolOf(action: MarkdownAction): ToolbarTool | undefined {
  const id =
    action.kind === 'inline'
      ? action.format
      : action.kind === 'line-prefix'
        ? action.prefix
        : action.kind;
  return TOOLBAR_TOOLS.find((tool) => tool.id === id);
}
