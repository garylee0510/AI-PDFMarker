/**
 * PDF Document Outline (PDF 大綱 / PDF 書籤目錄)
 * Focused specifically on the PDF document's structure, native bookmarks, and chapter TOC.
 * (Not bounding-box objects).
 */

export interface PdfOutlineItem {
  id: string;
  title: string;
  pageNumber: number; // 1-indexed PDF page number
  level: number; // 1 = Chapter / H1, 2 = Section / H2, 3 = Subsection / H3
  dest?: any; // Native PDF destination
  children?: PdfOutlineItem[];
  source: 'native_pdf_bookmark' | 'scanned_pdf_toc';
  bold?: boolean;
  italic?: boolean;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\- ]+/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Extracts the real PDF Document Outline (PDF 大綱 / 書籤目錄).
 * 1. Checks native PDF.js document outline (pdfDoc.getOutline()).
 * 2. If the PDF lacks embedded bookmarks, scans the PDF pages directly to extract the PDF chapter hierarchy.
 */
export async function extractPdfDocumentOutline(pdfDoc: any): Promise<PdfOutlineItem[]> {
  if (!pdfDoc) return [];

  // Step 1: Extract native PDF outline / bookmarks if present in the PDF file
  if (typeof pdfDoc.getOutline === 'function') {
    try {
      const rawOutline = await pdfDoc.getOutline();
      if (rawOutline && Array.isArray(rawOutline) && rawOutline.length > 0) {
        const resolveDestToPage = async (dest: any): Promise<number> => {
          try {
            let destArray = dest;
            if (typeof dest === 'string') {
              destArray = await pdfDoc.getDestination(dest);
            }
            if (Array.isArray(destArray) && destArray[0]) {
              const pageIndex = await pdfDoc.getPageIndex(destArray[0]);
              if (typeof pageIndex === 'number' && pageIndex >= 0) {
                return pageIndex + 1;
              }
            } else if (typeof dest === 'number' && dest >= 0) {
              return dest + 1;
            }
          } catch (e) {
            // Destination resolution fallback
          }
          return 1;
        };

        const processItems = async (
          items: any[],
          level: number
        ): Promise<PdfOutlineItem[]> => {
          const result: PdfOutlineItem[] = [];

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || !item.title) continue;

            let pageNum = 1;
            if (item.dest) {
              pageNum = await resolveDestToPage(item.dest);
            }

            const childNodes =
              item.items && Array.isArray(item.items) && item.items.length > 0
                ? await processItems(item.items, level + 1)
                : undefined;

            result.push({
              id: `pdf-bm-${level}-${i}-${Math.random().toString(36).slice(2, 7)}`,
              title: item.title.trim(),
              pageNumber: Math.max(1, Math.min(pageNum, pdfDoc.numPages || 1)),
              level: Math.min(6, Math.max(1, level)),
              dest: item.dest,
              children: childNodes,
              source: 'native_pdf_bookmark',
              bold: !!item.bold,
              italic: !!item.italic,
            });
          }

          return result;
        };

        const parsed = await processItems(rawOutline, 1);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('PDF.js getOutline failed or not present:', err);
    }
  }

  // Step 2: Fallback - Extract PDF Document chapters/headings from the PDF pages directly
  // This inspects the PDF file itself (NOT user bounding box objects).
  try {
    const totalPages = pdfDoc.numPages || 1;
    const scannedItems: PdfOutlineItem[] = [];

    // Regex for typical PDF document chapter/heading titles
    const chapterRegex =
      /^(\d+(\.\d+)*\s+[A-Z\u4e00-\u9fa5]|(ABSTRACT|EXECUTIVE SUMMARY|INTRODUCTION|METHODOLOGY|EXPERIMENTS|RESULTS|DISCUSSION|CONCLUSION|REFERENCES|ACKNOWLEDGEMENTS|SYSTEM ARCHITECTURE|PERFORMANCE BENCHMARKS|BILLING BREAKDOWN|PAYMENT INSTRUCTIONS)|第[一二三四五六七八九十\d]+[章節編段])/i;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      if (!textContent || !textContent.items) continue;

      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i] as any;
        if (!item || !item.str) continue;
        const str = item.str.trim();

        if (str.length >= 3 && str.length <= 90) {
          // Check if font size/height is prominent or matches standard chapter headings
          const height = Math.abs(item.transform?.[3] || item.height || 12);
          const isHeadingPattern = chapterRegex.test(str);

          if (height >= 14 || isHeadingPattern) {
            let level = 2;
            if (height >= 18 || /^(1\.|第[一\d]章|[A-Z\s]{5,})$/.test(str)) {
              level = 1;
            } else if (height < 15 && !isHeadingPattern) {
              level = 3;
            }

            // Deduplicate same heading on same page
            const exists = scannedItems.some(
              (it) => it.pageNumber === pageNum && it.title.toLowerCase() === str.toLowerCase()
            );
            if (!exists) {
              scannedItems.push({
                id: `scanned-pdf-toc-${pageNum}-${i}`,
                title: str,
                pageNumber: pageNum,
                level,
                source: 'scanned_pdf_toc',
              });
            }
          }
        }
      }
    }

    if (scannedItems.length > 0) {
      return scannedItems;
    }
  } catch (scanErr) {
    console.warn('PDF text chapter scan error:', scanErr);
  }

  return [];
}

/**
 * Recursively flattens a nested PDF outline tree into a flat list
 */
export function flattenPdfOutline(items: PdfOutlineItem[]): PdfOutlineItem[] {
  const result: PdfOutlineItem[] = [];

  function traverse(list: PdfOutlineItem[]) {
    for (const item of list) {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return result;
}

/**
 * Counts total nodes and level breakdown in a PDF outline
 */
export function countPdfOutlineNodes(items: PdfOutlineItem[]): {
  total: number;
  chapters: number;
  sections: number;
} {
  const flat = flattenPdfOutline(items);
  const total = flat.length;
  const chapters = flat.filter((item) => item.level === 1).length;
  const sections = flat.filter((item) => item.level > 1).length;
  return { total, chapters, sections };
}

/**
 * Generates a clean Markdown Table of Contents (TOC) from the PDF Document Outline
 */
export function generateMarkdownTocFromPdfOutline(items: PdfOutlineItem[]): string {
  const flat = flattenPdfOutline(items);
  if (flat.length === 0) return '';

  const lines: string[] = ['## PDF 文件大綱目錄 (Table of Contents)\n'];
  const minLevel = Math.min(...flat.map((n) => n.level));

  for (const item of flat) {
    const indent = '  '.repeat(Math.max(0, item.level - minLevel));
    const slug = slugifyHeading(item.title);
    lines.push(`${indent}- [${item.title}](#${slug}) *(PDF 第 ${item.pageNumber} 頁)*`);
  }

  return lines.join('\n');
}
