import { ExtractedTextItem, BoundingBox, PDFObjectItem, ConversionType } from '../types';
import { cropRegionFromCanvas } from './pdfRenderer';
import { formatInstantMarkdown } from './markdownFormatter';

export type SegmentationGranularity = 'semantic' | 'lines' | 'tables_headings';

export interface AutoSegmentOptions {
  granularity?: SegmentationGranularity;
  padding?: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface SegmentationSummary {
  total: number;
  headings: number;
  paragraphs: number;
  tables: number;
  code: number;
  math: number;
  lists: number;
}

/**
 * Fast client-side document layout analysis & content auto-segmenter
 * Executes in ~50ms without waiting for network/API calls!
 */
export function autoSegmentPageContent(
  textItems: ExtractedTextItem[],
  canvas: HTMLCanvasElement,
  pageNumber: number,
  options: AutoSegmentOptions
): { objects: PDFObjectItem[]; summary: SegmentationSummary } {
  const {
    granularity = 'semantic',
    padding = 6,
    viewportWidth,
    viewportHeight,
  } = options;

  if (!textItems || textItems.length === 0) {
    return {
      objects: [],
      summary: { total: 0, headings: 0, paragraphs: 0, tables: 0, code: 0, math: 0, lists: 0 },
    };
  }

  // 1. Clean and sort text items from top to bottom, then left to right
  const validItems = textItems
    .filter((t) => t.text && t.text.trim().length > 0)
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 6) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

  if (validItems.length === 0) {
    return {
      objects: [],
      summary: { total: 0, headings: 0, paragraphs: 0, tables: 0, code: 0, math: 0, lists: 0 },
    };
  }

  // 2. Calculate font height statistics
  const heights = validItems.map((i) => i.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 12;

  // 3. Line-based grouping (group items on almost same vertical baseline)
  interface LineGroup {
    text: string;
    items: ExtractedTextItem[];
    y: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    avgHeight: number;
  }

  const lines: LineGroup[] = [];
  let currentLine: ExtractedTextItem[] = [];
  let currentBaseY = validItems[0].y;

  function joinLineTokens(tokenItems: ExtractedTextItem[]): string {
    let lineText = '';
    for (let i = 0; i < tokenItems.length; i++) {
      const str = tokenItems[i].text;
      if (!str) continue;
      if (!lineText) {
        lineText = str;
      } else {
        if (lineText.endsWith(' ') || str.startsWith(' ')) {
          lineText += str;
        } else {
          const lastChar = lineText.charCodeAt(lineText.length - 1);
          const firstChar = str.charCodeAt(0);
          const isLastCJK =
            (lastChar >= 0x4e00 && lastChar <= 0x9fa5) ||
            (lastChar >= 0x3000 && lastChar <= 0x303f);
          const isFirstCJK =
            (firstChar >= 0x4e00 && firstChar <= 0x9fa5) ||
            (firstChar >= 0x3000 && firstChar <= 0x303f);

          if (isLastCJK && isFirstCJK) {
            lineText += str;
          } else {
            lineText += ' ' + str;
          }
        }
      }
    }
    return lineText.trim();
  }

  validItems.forEach((item) => {
    if (currentLine.length === 0) {
      currentLine.push(item);
      currentBaseY = item.y;
    } else {
      // If Y is within same line threshold (<= 6px difference)
      if (Math.abs(item.y - currentBaseY) <= 6) {
        currentLine.push(item);
      } else {
        // Finalize previous line
        currentLine.sort((a, b) => a.x - b.x);
        const lineText = joinLineTokens(currentLine);
        const minX = Math.min(...currentLine.map((i) => i.x));
        const maxX = Math.max(...currentLine.map((i) => i.x + i.width));
        const minY = Math.min(...currentLine.map((i) => i.y));
        const maxY = Math.max(...currentLine.map((i) => i.y + i.height));
        const avgH = currentLine.reduce((acc, i) => acc + i.height, 0) / currentLine.length;

        lines.push({
          text: lineText,
          items: currentLine,
          y: currentBaseY,
          minX,
          maxX,
          minY,
          maxY,
          avgHeight: avgH,
        });

        currentLine = [item];
        currentBaseY = item.y;
      }
    }
  });

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    const lineText = joinLineTokens(currentLine);
    const minX = Math.min(...currentLine.map((i) => i.x));
    const maxX = Math.max(...currentLine.map((i) => i.x + i.width));
    const minY = Math.min(...currentLine.map((i) => i.y));
    const maxY = Math.max(...currentLine.map((i) => i.y + i.height));
    const avgH = currentLine.reduce((acc, i) => acc + i.height, 0) / currentLine.length;

    lines.push({
      text: lineText,
      items: currentLine,
      y: currentBaseY,
      minX,
      maxX,
      minY,
      maxY,
      avgHeight: avgH,
    });
  }

  // 4. If granularity === 'lines', return each line as an object
  if (granularity === 'lines') {
    const rawObjects = lines.map((l, idx) => {
      const type: ConversionType =
        l.avgHeight > medianHeight * 1.3 ? 'heading_2' : 'paragraph';
      const box: BoundingBox = {
        x: Math.max(0, l.minX - padding),
        y: Math.max(0, l.minY - padding),
        width: Math.min(viewportWidth - l.minX + padding, l.maxX - l.minX + padding * 2),
        height: Math.min(viewportHeight - l.minY + padding, l.maxY - l.minY + padding * 2),
      };
      const crop = cropRegionFromCanvas(canvas, box);
      const md = formatInstantMarkdown(l.text, type, crop);

      return {
        id: `auto-line-${Date.now()}-${idx}`,
        pageNumber,
        box,
        conversionType: type,
        rawText: l.text,
        cropImageDataUrl: crop,
        markdownResult: md,
      };
    });

    return {
      objects: rawObjects,
      summary: {
        total: rawObjects.length,
        headings: rawObjects.filter((o) => o.conversionType.startsWith('heading')).length,
        paragraphs: rawObjects.filter((o) => o.conversionType === 'paragraph').length,
        tables: 0,
        code: 0,
        math: 0,
        lists: 0,
      },
    };
  }

  // 5. Semantic clustering: Group related lines into Blocks (Paragraphs, Headings, Tables, Code, Math)
  interface SemanticBlock {
    type: ConversionType;
    lines: LineGroup[];
  }

  const blocks: SemanticBlock[] = [];
  let activeBlock: SemanticBlock | null = null;

  function isHeadingLine(line: LineGroup): boolean {
    const isBig = line.avgHeight >= medianHeight * 1.25;
    const isTitlePattern = /^((\d+[\.\s]+[A-Z\u4e00-\u9fa5]+)|([A-Z\s]{4,})|(#+\s+)|(第[一二三四五六七八九十\d]+章))/i.test(line.text.trim());
    return isBig || (isTitlePattern && line.text.length < 90);
  }

  function isTableLine(line: LineGroup): boolean {
    if (line.text.includes('|')) return true;
    // Check multiple spaced columns (e.g. 3+ column chunks)
    const chunks = line.text.split(/\s{2,}|\t/);
    return chunks.length >= 3 && chunks.some((c) => /\d|%|\$|USD/i.test(c));
  }

  function isCodeLine(line: LineGroup): boolean {
    return /^(def\s+|import\s+|class\s+|function\s+|const\s+|let\s+|var\s+|return\s+|SELECT\s+|curl\s+|docker\s+)/.test(line.text.trim()) ||
      line.text.includes('()') || line.text.includes('=>') || line.text.includes('```');
  }

  function isMathLine(line: LineGroup): boolean {
    return /(L\(|\\theta|\\alpha|\\beta|\\sum|\\hat|SmoothL1|= alpha|= beta|\bE\s*=\s*mc|\b\int\b)/i.test(line.text);
  }

  function isListLine(line: LineGroup): boolean {
    return /^([-*•]|\d+\.|\(\d+\))\s+/.test(line.text.trim());
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Determine candidate type for this line
    let lineType: ConversionType = 'paragraph';
    if (isHeadingLine(line)) {
      lineType = line.avgHeight > medianHeight * 1.4 ? 'heading_1' : 'heading_2';
    } else if (isTableLine(line)) {
      lineType = 'table';
    } else if (isCodeLine(line)) {
      lineType = 'code';
    } else if (isMathLine(line)) {
      lineType = 'latex_math';
    } else if (isListLine(line)) {
      lineType = 'bullet_list';
    }

    if (!activeBlock) {
      activeBlock = { type: lineType, lines: [line] };
      continue;
    }

    // Check if we should append to current activeBlock or start new block
    const prevLine = activeBlock.lines[activeBlock.lines.length - 1];
    const verticalGap = line.minY - prevLine.maxY;

    // Headings are almost always standalone blocks
    if (lineType.startsWith('heading_') || activeBlock.type.startsWith('heading_')) {
      blocks.push(activeBlock);
      activeBlock = { type: lineType, lines: [line] };
      continue;
    }

    // Tables cluster together
    if (activeBlock.type === 'table' && (lineType === 'table' || verticalGap < medianHeight * 2)) {
      activeBlock.lines.push(line);
      continue;
    }

    // Code blocks cluster together
    if (activeBlock.type === 'code' && (lineType === 'code' || isCodeLine(line) || verticalGap < medianHeight * 2)) {
      activeBlock.lines.push(line);
      continue;
    }

    // Math lines
    if (activeBlock.type === 'latex_math' && lineType === 'latex_math') {
      activeBlock.lines.push(line);
      continue;
    }

    // Paragraph lines: if same type and close vertically (gap <= 2.2 line heights)
    if (
      activeBlock.type === lineType &&
      verticalGap <= medianHeight * 2.2
    ) {
      activeBlock.lines.push(line);
    } else {
      // Gap too large or different type -> finalize active block
      blocks.push(activeBlock);
      activeBlock = { type: lineType, lines: [line] };
    }
  }

  if (activeBlock) {
    blocks.push(activeBlock);
  }

  // 6. Filter by granularity option if needed
  let filteredBlocks = blocks;
  if (granularity === 'tables_headings') {
    filteredBlocks = blocks.filter(
      (b) => b.type.startsWith('heading') || b.type === 'table' || b.type === 'latex_math'
    );
  }

  // 7. Convert semantic blocks into PDFObjectItems with bounding box & instant Markdown
  const objects: PDFObjectItem[] = filteredBlocks.map((block, idx) => {
    const allMinX = Math.min(...block.lines.map((l) => l.minX));
    const allMaxX = Math.max(...block.lines.map((l) => l.maxX));
    const allMinY = Math.min(...block.lines.map((l) => l.minY));
    const allMaxY = Math.max(...block.lines.map((l) => l.maxY));

    const box: BoundingBox = {
      x: Math.max(0, allMinX - padding),
      y: Math.max(0, allMinY - padding),
      width: Math.min(viewportWidth - allMinX + padding, allMaxX - allMinX + padding * 2),
      height: Math.min(viewportHeight - allMinY + padding, allMaxY - allMinY + padding * 2),
    };

    const combinedRawText = block.lines.map((l) => l.text).join('\n');
    const cropData = cropRegionFromCanvas(canvas, box);
    const instantMd = formatInstantMarkdown(combinedRawText, block.type, cropData);

    return {
      id: `auto-obj-${Date.now()}-${idx}`,
      pageNumber,
      box,
      conversionType: block.type,
      rawText: combinedRawText,
      cropImageDataUrl: cropData,
      markdownResult: instantMd,
    };
  });

  const summary: SegmentationSummary = {
    total: objects.length,
    headings: objects.filter((o) => o.conversionType.startsWith('heading')).length,
    paragraphs: objects.filter((o) => o.conversionType === 'paragraph').length,
    tables: objects.filter((o) => o.conversionType === 'table').length,
    code: objects.filter((o) => o.conversionType === 'code').length,
    math: objects.filter((o) => o.conversionType === 'latex_math').length,
    lists: objects.filter((o) => o.conversionType === 'bullet_list' || o.conversionType === 'numbered_list').length,
  };

  return { objects, summary };
}
