import { BoundingBox, ExtractedTextItem } from '../types';

export interface AutoAlignResult {
  box: BoundingBox;
  method: 'text' | 'pixel';
  matchedItemsCount: number;
}

/**
 * Calculates optimal aligned bounding box (position and size) for a given object box.
 * 
 * 1. Text-based alignment: Finds all extracted text items that overlap with or are encompassed by the box,
 *    and calculates a tightly-fitted, padded bounding box around them.
 * 2. Visual pixel fallback: If no text items match (e.g. for graphics, diagrams, math formulas, scans),
 *    detects non-background content pixels on the canvas to snap tightly around visual content.
 */
export function calculateAutoAlignedBox(
  currentBox: BoundingBox,
  textItems: ExtractedTextItem[],
  canvas: HTMLCanvasElement | null
): AutoAlignResult | null {
  if (!currentBox || currentBox.width <= 0 || currentBox.height <= 0) {
    return null;
  }

  const canvasWidth = canvas?.width || 2000;
  const canvasHeight = canvas?.height || 2000;

  // --- Step 1: Text-based alignment ---
  if (textItems && textItems.length > 0) {
    const validItems = textItems.filter((item) => item.text && item.text.trim().length > 0);

    const matchedItems = validItems.filter((item) => {
      // Intersection box
      const interLeft = Math.max(currentBox.x, item.x);
      const interTop = Math.max(currentBox.y, item.y);
      const interRight = Math.min(currentBox.x + currentBox.width, item.x + item.width);
      const interBottom = Math.min(currentBox.y + currentBox.height, item.y + item.height);

      const interW = Math.max(0, interRight - interLeft);
      const interH = Math.max(0, interBottom - interTop);
      const interArea = interW * interH;

      if (interArea <= 0) return false;

      const itemArea = item.width * item.height;
      const boxArea = currentBox.width * currentBox.height;

      // Center point check
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      const isCenterInside =
        cx >= currentBox.x &&
        cx <= currentBox.x + currentBox.width &&
        cy >= currentBox.y &&
        cy <= currentBox.y + currentBox.height;

      if (isCenterInside) return true;

      // Overlap ratio check
      if (itemArea > 0 && interArea / itemArea >= 0.2) return true;
      if (boxArea > 0 && interArea / boxArea >= 0.2) return true;

      return false;
    });

    if (matchedItems.length > 0) {
      // Line completion expansion:
      // If the selection captured almost an entire line, check if adjacent words on the exact same baseline
      // are within 18px horizontally of the selection edge to avoid awkward cut-offs.
      const lineBaselines = matchedItems.map((m) => m.y);
      const expandedItems = [...matchedItems];

      validItems.forEach((candidate) => {
        if (expandedItems.some((e) => e === candidate)) return;

        const isOnSameLine = lineBaselines.some(
          (baseY) => Math.abs(candidate.y - baseY) <= 6
        );

        if (isOnSameLine) {
          // Check if candidate is immediately adjacent to the box horizontally
          const distToLeft = Math.abs(candidate.x + candidate.width - currentBox.x);
          const distToRight = Math.abs(candidate.x - (currentBox.x + currentBox.width));
          if (distToLeft < 18 || distToRight < 18) {
            expandedItems.push(candidate);
          }
        }
      });

      const minX = Math.min(...expandedItems.map((i) => i.x));
      const minY = Math.min(...expandedItems.map((i) => i.y));
      const maxX = Math.max(...expandedItems.map((i) => i.x + i.width));
      const maxY = Math.max(...expandedItems.map((i) => i.y + i.height));

      // Clean padding for aesthetic spacing around typography
      const padX = 6;
      const padY = 4;

      const alignedX = Math.max(0, Math.floor(minX - padX));
      const alignedY = Math.max(0, Math.floor(minY - padY));
      const alignedWidth = Math.min(
        canvasWidth - alignedX,
        Math.ceil(maxX - minX + padX * 2)
      );
      const alignedHeight = Math.min(
        canvasHeight - alignedY,
        Math.ceil(maxY - minY + padY * 2)
      );

      return {
        box: {
          x: alignedX,
          y: alignedY,
          width: Math.max(20, alignedWidth),
          height: Math.max(16, alignedHeight),
        },
        method: 'text',
        matchedItemsCount: expandedItems.length,
      };
    }
  }

  // --- Step 2: Visual pixel fallback (charts, images, diagrams, handwritten content) ---
  if (canvas) {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Expand search area by 12px margin
        const margin = 12;
        const sx = Math.max(0, Math.floor(currentBox.x - margin));
        const sy = Math.max(0, Math.floor(currentBox.y - margin));
        const sw = Math.min(canvas.width - sx, Math.ceil(currentBox.width + margin * 2));
        const sh = Math.min(canvas.height - sy, Math.ceil(currentBox.height + margin * 2));

        if (sw > 0 && sh > 0) {
          const imgData = ctx.getImageData(sx, sy, sw, sh);
          const data = imgData.data;

          let pMinX = Infinity;
          let pMinY = Infinity;
          let pMaxX = -Infinity;
          let pMaxY = -Infinity;
          let contentPixelCount = 0;

          for (let row = 0; row < sh; row++) {
            for (let col = 0; col < sw; col++) {
              const idx = (row * sw + col) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              // Background is white/transparent; content pixel is darker or non-opaque
              if (a > 30 && (r < 240 || g < 240 || b < 240)) {
                contentPixelCount++;
                if (col < pMinX) pMinX = col;
                if (col > pMaxX) pMaxX = col;
                if (row < pMinY) pMinY = row;
                if (row > pMaxY) pMaxY = row;
              }
            }
          }

          // If content pixels exist
          if (contentPixelCount >= 10 && pMinX <= pMaxX && pMinY <= pMaxY) {
            const pad = 6;
            const alignedX = Math.max(0, sx + pMinX - pad);
            const alignedY = Math.max(0, sy + pMinY - pad);
            const alignedMaxX = Math.min(canvas.width, sx + pMaxX + pad);
            const alignedMaxY = Math.min(canvas.height, sy + pMaxY + pad);

            return {
              box: {
                x: alignedX,
                y: alignedY,
                width: Math.max(20, Math.ceil(alignedMaxX - alignedX)),
                height: Math.max(16, Math.ceil(alignedMaxY - alignedY)),
              },
              method: 'pixel',
              matchedItemsCount: contentPixelCount,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Canvas pixel alignment encountered an error:', err);
    }
  }

  return null;
}
