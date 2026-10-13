import * as pdfjsLib from 'pdfjs-dist';
import { BoundingBox, ExtractedTextItem } from '../types';

// Set up pdfjs worker using locally served asset with unpkg fallback
const PDFJS_VERSION = pdfjsLib.version || '6.4.299';

if (typeof window !== 'undefined') {
  try {
    // Prioritize locally served worker from /pdfjs-dist/build/pdf.worker.min.mjs
    // This avoids external network failures, latency, or strict iframe sandbox restrictions
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs-dist/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Failed to configure local pdf.workerSrc, falling back:', e);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  }
}

export async function loadPdf(
  source: ArrayBuffer | Uint8Array | string,
  options?: {
    password?: string;
    onPassword?: (callback: (password: string) => void, reason: string) => void;
  }
) {
  let dataParam: Uint8Array | undefined;
  if (typeof source !== 'string') {
    if (source instanceof Uint8Array) {
      // Make a fresh copy to prevent buffer neutering/detachment when transferred to Web Worker
      dataParam = new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
    } else {
      dataParam = new Uint8Array(source.slice(0));
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const localCMap = origin ? `${origin}/pdfjs-dist/cmaps/` : '';
  const localFonts = origin ? `${origin}/pdfjs-dist/standard_fonts/` : '';
  const fallbackCMap = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
  const fallbackFonts = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;

  const docParams: any = {
    ...(typeof source === 'string' ? { url: source } : { data: dataParam }),
    cMapUrl: localCMap || fallbackCMap,
    cMapPacked: true,
    standardFontDataUrl: localFonts || fallbackFonts,
    stopAtErrors: false,
    isEvalSupported: false,
    useSystemFonts: true,
    enableXfa: true,
    verbosity: 0,
  };

  if (options?.password) {
    docParams.password = options.password;
  }

  const loadingTask = pdfjsLib.getDocument(docParams);

  if (options?.onPassword) {
    loadingTask.onPassword = options.onPassword;
  }

  return await loadingTask.promise;
}

/**
 * Extracts and detects the PDF specification version (e.g. 'PDF 1.3', 'PDF 1.4', 'PDF 1.7')
 * from raw binary bytes or pdfDoc metadata
 */
export async function extractPdfVersion(
  source: Uint8Array | ArrayBuffer | string,
  pdfDoc?: any
): Promise<string> {
  // 1. Direct inspection of PDF header bytes (%PDF-X.Y)
  if (typeof source !== 'string') {
    try {
      const u8 = source instanceof Uint8Array ? source : new Uint8Array(source);
      // Read the first 2048 bytes
      const headerChunk = u8.subarray(0, Math.min(u8.byteLength, 2048));
      const headerText = new TextDecoder('latin1').decode(headerChunk);
      
      const match = headerText.match(/%PDF-([0-9]+\.[0-9]+)/);
      if (match && match[1]) {
        return `PDF ${match[1]}`;
      }
    } catch (e) {
      console.warn('Error reading raw PDF header for version:', e);
    }
  }

  // 2. Query PDF.js document metadata
  if (pdfDoc && typeof pdfDoc.getMetadata === 'function') {
    try {
      const meta = await pdfDoc.getMetadata();
      if (meta?.info?.PDFFormatVersion) {
        return `PDF ${meta.info.PDFFormatVersion}`;
      }
      if (meta?.metadata?.get) {
        const v = meta.metadata.get('pdf:pdfversion');
        if (v) return `PDF ${v}`;
      }
    } catch (e) {
      console.warn('Error reading pdfDoc metadata for version:', e);
    }
  }

  return 'PDF 1.4';
}

export interface RenderResult {
  viewportWidth: number;
  viewportHeight: number;
  textItems: ExtractedTextItem[];
  pageImageBase64: string;
}

export async function renderPage(
  pdfDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<RenderResult> {
  // Cancel previous render task on this canvas if still in flight
  const previousTask = (canvas as any)._activeRenderTask;
  if (previousTask && typeof previousTask.cancel === 'function') {
    try {
      previousTask.cancel();
    } catch {
      // ignore cancellation errors
    }
    (canvas as any)._activeRenderTask = null;
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const targetWidth = Math.max(10, Math.floor(viewport.width));
  const targetHeight = Math.max(10, Math.floor(viewport.height));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Clear canvas with solid white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    intent: 'display',
  };

  const renderTask = page.render(renderContext);
  (canvas as any)._activeRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException' || err?.message?.includes('Rendering cancelled')) {
      const cancelErr: any = new Error('Rendering cancelled');
      cancelErr.isCancelled = true;
      throw cancelErr;
    }
    console.error(`Page ${pageNumber} render failed:`, err);
    throw err;
  } finally {
    if ((canvas as any)._activeRenderTask === renderTask) {
      (canvas as any)._activeRenderTask = null;
    }
  }

  // Extract text content safely without failing page render if metadata is corrupted
  let textItems: ExtractedTextItem[] = [];
  try {
    const textContent = await page.getTextContent();
    for (const item of textContent.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;

      const tx = item.transform;
      const itemWidth = (item.width || 20) * scale;
      const itemHeight = (item.height || 12) * scale;

      let x = tx[4] * scale;
      let y = viewport.height - (tx[5] * scale) - itemHeight;

      if (Array.isArray(viewport.transform) && Array.isArray(tx)) {
        try {
          const pt: any = (pdfjsLib.Util as any)?.applyTransform?.([tx[4], tx[5]], viewport.transform);
          if (Array.isArray(pt)) {
            x = pt[0];
            y = pt[1] - itemHeight;
          }
        } catch {
          // fallback
        }
      }

      textItems.push({
        text: item.str,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(itemWidth, 10),
        height: Math.max(itemHeight, 10),
      });
    }
  } catch (textErr) {
    console.warn(`Text extraction warning for page ${pageNumber}:`, textErr);
  }

  // Extract base64 image safely without crashing on huge canvas
  let pageImageBase64 = '';
  try {
    pageImageBase64 = canvas.toDataURL('image/png', 0.9);
  } catch {
    try {
      pageImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    } catch (jpegErr) {
      console.warn('Canvas toDataURL failed:', jpegErr);
    }
  }

  return {
    viewportWidth: targetWidth,
    viewportHeight: targetHeight,
    textItems,
    pageImageBase64,
  };
}

/**
 * Crop a specific bounding box from the canvas into a high-quality base64 image
 */
export function cropRegionFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  box: BoundingBox
): string {
  const cropCanvas = document.createElement('canvas');
  // Clamp boundaries
  const sx = Math.max(0, Math.floor(box.x));
  const sy = Math.max(0, Math.floor(box.y));
  const sw = Math.min(Math.floor(box.width), sourceCanvas.width - sx);
  const sh = Math.min(Math.floor(box.height), sourceCanvas.height - sy);

  if (sw <= 0 || sh <= 0) {
    return '';
  }

  cropCanvas.width = sw;
  cropCanvas.height = sh;

  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropCanvas.toDataURL('image/png', 0.95);
}

/**
 * Filter text items that intersect or fall inside the given bounding box.
 * Preserves actual line breaks (斷行) between different vertical lines instead of merging all into one line.
 */
export function extractTextInBox(
  textItems: ExtractedTextItem[],
  box: BoundingBox
): string {
  const inside = textItems.filter((item) => {
    // Check overlap
    const itemRight = item.x + item.width;
    const itemBottom = item.y + item.height;
    const boxRight = box.x + box.width;
    const boxBottom = box.y + box.height;

    const noOverlap =
      item.x > boxRight ||
      itemRight < box.x ||
      item.y > boxBottom ||
      itemBottom < box.y;

    return !noOverlap;
  });

  if (inside.length === 0) return '';

  // Sort top-to-bottom, then left-to-right
  inside.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 6) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  // Group items that share the same horizontal baseline into lines
  const lines: ExtractedTextItem[][] = [];
  let currentLine: ExtractedTextItem[] = [];
  let currentBaseY = inside[0].y;

  for (const item of inside) {
    if (currentLine.length === 0) {
      currentLine.push(item);
      currentBaseY = item.y;
    } else {
      if (Math.abs(item.y - currentBaseY) <= 6) {
        currentLine.push(item);
      } else {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        currentLine = [item];
        currentBaseY = item.y;
      }
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // Join items on the same line, and join separate lines with newline '\n'
  return lines
    .map((lineItems) => {
      let lineText = '';
      for (let i = 0; i < lineItems.length; i++) {
        const str = lineItems[i].text;
        if (!str) continue;
        if (!lineText) {
          lineText = str;
        } else {
          if (lineText.endsWith(' ') || str.startsWith(' ')) {
            lineText += str;
          } else {
            // If both adjacent characters are CJK, don't insert extra space
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
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Render a lightweight image thumbnail for a given PDF page
 */
export async function renderPageThumbnail(
  pdfDoc: any,
  pageNumber: number,
  targetWidth: number = 140
): Promise<string> {
  if (!pdfDoc) return '';
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / Math.max(1, unscaledViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.82);
  } catch (err) {
    console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, err);
    return '';
  }
}

