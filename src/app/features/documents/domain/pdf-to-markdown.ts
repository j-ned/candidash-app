/** Fragment de texte d'une page PDF, tel que le lit pdf.js (`y` part du bas de la page). */
export type PdfTextItem = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
};

type LineKind = 'title' | 'section' | 'item' | 'text';

type Line = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
};

type Block = {
  readonly kind: LineKind;
  readonly lines: string[];
  readonly itemX: number;
  readonly bulleted: boolean;
  lastY: number;
};

const BULLET = /^[•◦▪●‣∙\-–*]\s*/;
// Taille relative au corps du texte à partir de laquelle une ligne devient un titre
const TITLE_RATIO = 1.6;
const SECTION_RATIO = 1.15;
// Retrait (en taille de corps) qui signale un élément de liste dont la puce est un dessin
const ITEM_INDENT = 0.8;
// Écart au-delà de l'interligne habituel qui ouvre un nouveau paragraphe
const PARAGRAPH_RATIO = 1.35;
// Intitulé de section en capitales : court, sans minuscule
const CAPITALISED_HEADING = /^(?=(?:.*\p{Lu}){3})[^\p{Ll}]{3,40}$/u;

/**
 * Texte extrait d'un PDF → Markdown simple. Titres devinés par la taille de police ou les
 * capitales, puces par leur caractère ou par le retrait, paragraphes par les écarts plus grands
 * que l'interligne habituel. La mise en page d'origine est perdue : c'est un point de départ.
 */
export function pdfToMarkdown(pages: readonly (readonly PdfTextItem[])[]): string {
  const pageLines = pages.map(toLines);
  const lines = pageLines.flat();
  const bodySize = mostFrequent(lines.map((line) => [line.fontSize, line.text.length]));
  const lineGap = typicalLineGap(pageLines, bodySize);
  return pageLines
    .flatMap((page) => toBlocks(page, bodySize, lineGap))
    .map(renderBlock)
    .join('\n\n');
}

function toLines(items: readonly PdfTextItem[]): Line[] {
  const sorted = items
    .filter((item) => item.text.trim() !== '')
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextItem[][] = [];
  for (const item of sorted) {
    const current = lines.at(-1);
    if (current && Math.abs(current[0].y - item.y) <= item.fontSize * 0.5) current.push(item);
    else lines.push([item]);
  }
  return lines.map((parts) => {
    const ordered = [...parts].sort((a, b) => a.x - b.x);
    return {
      text: ordered
        .map((part) => part.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      x: ordered[0].x,
      y: ordered[0].y,
      fontSize: Math.max(...ordered.map((part) => part.fontSize)),
    };
  });
}

/** Valeur la plus portée (arrondie au dixième), la plus petite en cas d'égalité. */
function mostFrequent(values: readonly (readonly [value: number, weight: number])[]): number {
  const weights = new Map<number, number>();
  for (const [value, weight] of values) {
    const rounded = Math.round(value * 10) / 10;
    weights.set(rounded, (weights.get(rounded) ?? 0) + weight);
  }
  let best = 0;
  let bestWeight = -1;
  for (const [value, weight] of weights) {
    if (weight > bestWeight || (weight === bestWeight && value < best)) {
      [best, bestWeight] = [value, weight];
    }
  }
  return best;
}

/** Interligne le plus fréquent entre deux lignes consécutives d'une page (au point près). */
function typicalLineGap(pages: readonly (readonly Line[])[], bodySize: number): number {
  const gaps = pages.flatMap((lines) =>
    lines.slice(1).map((line, index) => Math.round(lines[index].y - line.y)),
  );
  const plausible = gaps.filter((gap) => gap > 0 && gap < bodySize * 4);
  if (plausible.length === 0) return bodySize * 1.2;
  return mostFrequent(plausible.map((gap) => [gap, 1]));
}

function kindOf(line: Line, bodySize: number, marginX: number): LineKind {
  if (line.fontSize >= bodySize * TITLE_RATIO) return 'title';
  if (line.fontSize >= bodySize * SECTION_RATIO || CAPITALISED_HEADING.test(line.text)) {
    return 'section';
  }
  if (BULLET.test(line.text) || line.x >= marginX + bodySize * ITEM_INDENT) return 'item';
  return 'text';
}

function toBlocks(lines: readonly Line[], bodySize: number, lineGap: number): Block[] {
  const marginX = Math.min(...lines.map((line) => line.x));
  const blocks: Block[] = [];
  for (const line of lines) {
    const kind = kindOf(line, bodySize, marginX);
    const bulleted = BULLET.test(line.text);
    const text = escapeMarkdown(bulleted ? line.text.replace(BULLET, '') : line.text);
    const previous = blocks.at(-1);
    const close = previous !== undefined && previous.lastY - line.y <= lineGap * PARAGRAPH_RATIO;

    if (close && previous.bulleted && !bulleted && line.x > previous.itemX + 2) {
      // Suite d'une puce trop longue, renvoyée à la ligne sous son texte
      previous.lines[previous.lines.length - 1] += ` ${text}`;
      previous.lastY = line.y;
    } else if (close && previous.kind === kind && (kind === 'text' || kind === 'item')) {
      previous.lines.push(text);
      previous.lastY = line.y;
    } else {
      blocks.push({ kind, lines: [text], itemX: line.x, bulleted, lastY: line.y });
    }
  }
  return blocks;
}

function renderBlock({ kind, lines }: Block): string {
  switch (kind) {
    case 'title':
      return `# ${lines.join(' ')}`;
    case 'section':
      return `## ${lines.join(' ')}`;
    case 'item':
      return lines.map((text) => `- ${text}`).join('\n');
    case 'text':
      return lines.join('\n');
  }
}

/** Neutralise ce que Markdown interpréterait : emphase, code, et marqueurs de début de ligne. */
function escapeMarkdown(text: string): string {
  return text
    .replace(/([*`])/g, '\\$1')
    .replace(/^([#>+])/, '\\$1')
    .replace(/^(\d+)\.(\s)/, '$1\\.$2');
}
