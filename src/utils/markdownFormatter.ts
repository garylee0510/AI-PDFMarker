import { marked } from 'marked';
import katex from 'katex';
import { ConversionType } from '../types';

/**
 * Format raw text into an instant Markdown representation based on the conversion type
 */
export function formatInstantMarkdown(
  rawText: string = '',
  type: ConversionType,
  cropImageDataUrl?: string
): string {
  const text = rawText.trim();

  switch (type) {
    case 'heading_1': {
      const clean = text.replace(/^[#\s\d.-]+/, '').trim() || '章節標題';
      return `# ${clean}`;
    }

    case 'heading_2': {
      const clean = text.replace(/^[#\s\d.-]+/, '').trim() || '副標題';
      return `## ${clean}`;
    }

    case 'heading_3': {
      const clean = text.replace(/^[#\s\d.-]+/, '').trim() || '子章節標題';
      return `### ${clean}`;
    }

    case 'paragraph': {
      if (!text) return '這是一段正文內文。';
      // 該斷行就斷行，嚴格保留原始斷行，請勿自行合併成一行
      return text;
    }

    case 'table': {
      if (!text) {
        return '| 項目 | 規格 | 數值 |\n|---|---|---|\n| 範例 A | 核心處理器 | 8 核心 |\n| 範例 B | 記憶體 | 32 GB |';
      }

      // Check if text already has pipe table formatting
      if (text.includes('|')) {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length >= 1) {
          const hasSeparator = lines.some((l) => l.includes('---'));
          if (hasSeparator) {
            return text;
          }
          // Build separator for lines with |
          const header = lines[0];
          const colCount = Math.max(2, header.split('|').filter(Boolean).length);
          const sep = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
          return [lines[0], sep, ...lines.slice(1)].join('\n');
        }
      }

      // If text is tab or space delimited lines
      const rawLines = text.split('\n').filter((l) => l.trim().length > 0);
      if (rawLines.length > 0) {
        const parsedRows = rawLines.map((line) => {
          if (line.includes('\t')) {
            return line.split('\t').map((c) => c.trim()).filter(Boolean);
          }
          // Split by 2+ consecutive spaces or commas
          return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
        });

        const maxCols = Math.max(...parsedRows.map((r) => r.length), 2);
        const headerRow = parsedRows[0] || ['欄位 1', '欄位 2'];
        while (headerRow.length < maxCols) {
          headerRow.push(`欄位 ${headerRow.length + 1}`);
        }

        const tableLines: string[] = [
          '| ' + headerRow.join(' | ') + ' |',
          '| ' + Array(maxCols).fill('---').join(' | ') + ' |',
        ];

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          while (row.length < maxCols) row.push('-');
          tableLines.push('| ' + row.join(' | ') + ' |');
        }

        return tableLines.join('\n');
      }

      return '| 欄位 1 | 欄位 2 |\n|---|---|\n| 資料 A | 資料 B |';
    }

    case 'code': {
      if (!text) {
        return '```python\n# 程式碼區塊\ndef process_data():\n    return True\n```';
      }
      let lang = 'python';
      if (text.includes('function') || text.includes('const') || text.includes('import')) {
        lang = 'typescript';
      } else if (text.includes('SELECT') || text.includes('FROM')) {
        lang = 'sql';
      } else if (text.includes('{') && text.includes('}') && text.includes(':')) {
        lang = 'json';
      }
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }

    case 'latex_math': {
      if (!text) {
        return '$$\nL(\\theta) = \\alpha \\cdot \\text{Loss}_{\\text{CE}} + \\beta \\cdot \\text{SmoothL1}(b - \\hat{b})\n$$';
      }
      // If it contains math characters or formula
      const cleanMath = text
        .replace(/theta/g, '\\theta')
        .replace(/alpha/g, '\\alpha')
        .replace(/beta/g, '\\beta')
        .replace(/sum/g, '\\sum')
        .replace(/hat/g, '\\hat');
      return `$$\n${cleanMath}\n$$`;
    }

    case 'image_caption': {
      const imgUrl = cropImageDataUrl || 'https://placehold.co/600x400/1e293b/94a3b8?text=PDF+Figure';
      const caption = text || '擷取之圖表與架構圖';
      return `![${caption}](${imgUrl})\n\n*圖說：${caption}*`;
    }

    case 'bullet_list': {
      if (!text) return '- 項目一\n- 項目二\n- 項目三';
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `- ${l.replace(/^[-*•\d.]+\s*/, '')}`)
        .join('\n');
    }

    case 'numbered_list': {
      if (!text) return '1. 第一步驟\n2. 第二步驟\n3. 第三步驟';
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i) => `${i + 1}. ${l.replace(/^[-*•\d.]+\s*/, '')}`)
        .join('\n');
    }

    case 'quote': {
      if (!text) return '> 「知識就是力量。」';
      return text
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
    }

    case 'callout_note': {
      const content = text || '請注意此處的重要規範與使用說明。';
      const lines = content.split('\n').map((l) => `> ${l}`).join('\n');
      return `> [!NOTE]\n> **重點提醒**\n${lines}`;
    }

    case 'ignore':
      return '';

    case 'auto_detect':
    default: {
      if (!text) return '智慧識別段落內容。';
      if (text.includes('|')) return formatInstantMarkdown(text, 'table', cropImageDataUrl);
      if (text.length < 50 && (text.includes('1.') || text.includes('2.'))) {
        return formatInstantMarkdown(text, 'heading_2', cropImageDataUrl);
      }
      return formatInstantMarkdown(text, 'paragraph', cropImageDataUrl);
    }
  }
}

/**
 * Pre-process LaTeX equations in markdown so marked doesn't mangle backslashes or symbols
 */
function processMathExpressions(markdown: string): { processed: string; mathMap: Map<string, string> } {
  const mathMap = new Map<string, string>();
  let mathCounter = 0;

  // Replace display math $$ ... $$
  let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    const key = `%%MATH_DISPLAY_${mathCounter++}%%`;
    try {
      const html = katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathMap.set(key, `<div class="katex-display-container my-3 overflow-x-auto py-2 text-center bg-slate-950/60 rounded-lg border border-slate-800/80">${html}</div>`);
    } catch (e) {
      mathMap.set(key, `<pre class="text-rose-400 font-mono text-xs">$$ ${tex} $$</pre>`);
    }
    return key;
  });

  // Replace inline math $ ... $ (avoid matching escaped \$ or money like $10)
  processed = processed.replace(/(?<!\\)\$([^\$\n]+?)\$(?!\d)/g, (_, tex) => {
    const key = `%%MATH_INLINE_${mathCounter++}%%`;
    try {
      const html = katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      mathMap.set(key, `<span class="katex-inline-container inline-block px-1">${html}</span>`);
    } catch (e) {
      mathMap.set(key, `<code class="text-rose-400">$${tex}$</code>`);
    }
    return key;
  });

  return { processed, mathMap };
}

/**
 * Process GitHub-style callouts:
 * > [!NOTE]
 * > [!TIP]
 * > [!IMPORTANT]
 * > [!WARNING]
 * > [!CAUTION]
 */
function processCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([\s\S]*?)<\/blockquote>/gi,
    (match, type, content) => {
      const calloutType = type.toUpperCase();
      let border = 'border-blue-500';
      let bg = 'bg-blue-950/30';
      let text = 'text-blue-400';
      let label = 'NOTE';

      if (calloutType === 'TIP') {
        border = 'border-emerald-500';
        bg = 'bg-emerald-950/30';
        text = 'text-emerald-400';
        label = 'TIP';
      } else if (calloutType === 'WARNING') {
        border = 'border-amber-500';
        bg = 'bg-amber-950/30';
        text = 'text-amber-400';
        label = 'WARNING';
      } else if (calloutType === 'CAUTION') {
        border = 'border-rose-500';
        bg = 'bg-rose-950/30';
        text = 'text-rose-400';
        label = 'CAUTION';
      } else if (calloutType === 'IMPORTANT') {
        border = 'border-purple-500';
        bg = 'bg-purple-950/30';
        text = 'text-purple-400';
        label = 'IMPORTANT';
      }

      return `<div class="callout my-4 p-4 rounded-xl border-l-4 ${border} ${bg} text-slate-200 shadow-sm">
        <div class="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider ${text} mb-1.5">
          <span>●</span>
          <span>${label}</span>
        </div>
        <div class="callout-body text-sm">${content}</div>
      </div>`;
    }
  );
}

/**
 * Render Markdown to HTML with KaTeX formulas, tables, callouts, and clean styling
 */
export function renderMarkdownHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<div class="text-slate-500 italic p-6 text-center">暫無 Markdown 內容</div>';
  }

  // 1. Preprocess Math ($$ and $)
  const { processed, mathMap } = processMathExpressions(markdown);

  // 2. Parse Markdown to HTML via marked
  let html = marked.parse(processed, {
    gfm: true,
    breaks: true,
  }) as string;

  // 3. Postprocess Callouts
  html = processCallouts(html);

  // 4. Restore rendered Math HTML tags
  mathMap.forEach((mathHtml, key) => {
    html = html.split(key).join(mathHtml);
  });

  // 5. Inject anchor IDs into headings so TOC links can smoothly scroll
  html = html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
    if (attrs && attrs.includes('id=')) return match;
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    const id = cleanText
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\- ]+/g, '')
      .replace(/\s+/g, '-');
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });

  return html;
}
