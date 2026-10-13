import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { PDFObjectItem, BoundingBox, ExtractedTextItem, ConversionType } from '../types';
import { renderPage, cropRegionFromCanvas, extractTextInBox } from '../utils/pdfRenderer';
import { formatInstantMarkdown } from '../utils/markdownFormatter';
import { autoSegmentPageContent, SegmentationGranularity } from '../utils/autoSegmenter';
import { calculateAutoAlignedBox } from '../utils/autoAligner';
import { CONVERSION_TYPE_CONFIGS, getObjectTheme } from './ConversionTypeBadge';
import { PdfPageListSidebar } from './PdfPageListSidebar';
import {
  MousePointer,
  Crop,
  Type,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Scan,
  ScanLine,
  Check,
  RotateCw,
  Zap,
  ChevronDown,
  Layers,
  Palette,
  FileText,
  Lock,
  Unlock,
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export type DragHandleType =
  | 'move'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 's'
  | 'e'
  | 'w';

export interface DragState {
  type: DragHandleType;
  objectId: string;
  startX: number;
  startY: number;
  initialBox: BoundingBox;
}

interface Props {
  pdfDoc: any;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  pageObjects: PDFObjectItem[];
  allPagesObjects?: Record<number, PDFObjectItem[]>;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onAddObject: (newObj: PDFObjectItem) => void;
  onUpdateObject: (updated: PDFObjectItem, reorder?: boolean) => void;
  onDeleteObject: (id: string) => void;
  onTriggerConvert: (item: PDFObjectItem) => Promise<void>;
  onTriggerAutoDetectPage: (pageImg: string, textItems: ExtractedTextItem[], w: number, h: number) => Promise<void>;
  isDetectingObjects?: boolean;
  onClearAllObjects?: () => void;
  onClearPageObjects?: () => void;
  totalObjectCount?: number;
  onBatchSetPageObjects?: (pageNumber: number, objects: PDFObjectItem[], message?: string) => void;
  onRegisterAutoAlign?: (fn: ((objectId: string) => void) | null) => void;
  pdfVersion?: string;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  selectionMode?: SelectionMode;
  onSelectionModeChange?: (mode: SelectionMode) => void;
  showPageList?: boolean;
  onTogglePageList?: () => void;
  onRegisterPdfActions?: (actions: PdfViewerActions | null) => void;
}

export type SelectionMode = 'box' | 'text' | 'pan';

export interface PdfViewerActions {
  quickAutoSegment: (granularity?: SegmentationGranularity) => void;
  triggerAutoDetect: () => void;
  fitToWidth: () => void;
  toggleLock: (objectId: string) => void;
  autoAlign: (objectId: string) => void;
}

export const PdfCanvasViewer: React.FC<Props> = ({
  pdfDoc,
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  pageObjects,
  allPagesObjects = {},
  selectedObjectId,
  onSelectObject,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onTriggerConvert,
  onTriggerAutoDetectPage,
  isDetectingObjects = false,
  onClearAllObjects,
  onClearPageObjects,
  totalObjectCount = 0,
  onBatchSetPageObjects,
  onRegisterAutoAlign,
  pdfVersion,
  isRightSidebarOpen,
  onToggleRightSidebar,
  selectionMode: propSelectionMode,
  onSelectionModeChange,
  showPageList: propShowPageList,
  onTogglePageList,
  onRegisterPdfActions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [internalShowPageList, setInternalShowPageList] = useState(true);
  const showPageList = propShowPageList !== undefined ? propShowPageList : internalShowPageList;
  const setShowPageList = (show: boolean | ((prev: boolean) => boolean)) => {
    if (typeof show === 'function') {
      const next = show(showPageList);
      setInternalShowPageList(next);
      if (next !== showPageList) onTogglePageList?.();
    } else {
      setInternalShowPageList(show);
      if (show !== showPageList) onTogglePageList?.();
    }
  };

  const [sidebarTab, setSidebarTab] = useState<'pages' | 'outline'>('pages');
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [extractedTexts, setExtractedTexts] = useState<ExtractedTextItem[]>([]);
  const [pageImageBase64, setPageImageBase64] = useState<string>('');

  const [internalSelectionMode, setInternalSelectionMode] = useState<SelectionMode>('box');
  const selectionMode = propSelectionMode !== undefined ? propSelectionMode : internalSelectionMode;
  const setSelectionMode = (mode: SelectionMode) => {
    setInternalSelectionMode(mode);
    onSelectionModeChange?.(mode);
  };

  const [hoveredTextItem, setHoveredTextItem] = useState<ExtractedTextItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [isQuickSegmenting, setIsQuickSegmenting] = useState(false);

  // Drawing state for box creation
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  // Helper to determine system cursor for handle types
  const getCursorForHandle = (type: DragHandleType): string => {
    switch (type) {
      case 'move':
        return 'move';
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  // Moving and Resizing object state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveDragBox, setLiveDragBox] = useState<BoundingBox | null>(null);
  const latestDragBoxRef = useRef<BoundingBox | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Stable references to prevent window listener re-registration during drag
  const pageObjectsRef = useRef(pageObjects);
  pageObjectsRef.current = pageObjects;
  const onUpdateObjectRef = useRef(onUpdateObject);
  onUpdateObjectRef.current = onUpdateObject;
  const extractedTextsRef = useRef(extractedTexts);
  extractedTextsRef.current = extractedTexts;
  const viewportDimsRef = useRef(viewportDims);
  viewportDimsRef.current = viewportDims;

  // Global window listeners for ultra-smooth moving and resizing
  useEffect(() => {
    if (!dragState) return;

    // Apply global drag cursor & disable text selection to eliminate mouse jitter
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = getCursorForHandle(dragState.type);
    document.body.style.userSelect = 'none';

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const init = dragState.initialBox;
      const maxX = viewportDimsRef.current.width;
      const maxY = viewportDimsRef.current.height;

      let newBox: BoundingBox = { ...init };

      if (dragState.type === 'move') {
        newBox = {
          x: Math.round(Math.max(0, Math.min(maxX - init.width, init.x + dx))),
          y: Math.round(Math.max(0, Math.min(maxY - init.height, init.y + dy))),
          width: Math.round(init.width),
          height: Math.round(init.height),
        };
      } else if (dragState.type === 'se') {
        newBox = {
          x: init.x,
          y: init.y,
          width: Math.round(Math.max(20, Math.min(maxX - init.x, init.width + dx))),
          height: Math.round(Math.max(20, Math.min(maxY - init.y, init.height + dy))),
        };
      } else if (dragState.type === 'nw') {
        const right = init.x + init.width;
        const bottom = init.y + init.height;
        const x = Math.round(Math.max(0, Math.min(right - 20, init.x + dx)));
        const y = Math.round(Math.max(0, Math.min(bottom - 20, init.y + dy)));
        newBox = { x, y, width: right - x, height: bottom - y };
      } else if (dragState.type === 'ne') {
        const bottom = init.y + init.height;
        const y = Math.round(Math.max(0, Math.min(bottom - 20, init.y + dy)));
        newBox = {
          x: init.x,
          y,
          width: Math.round(Math.max(20, Math.min(maxX - init.x, init.width + dx))),
          height: bottom - y,
        };
      } else if (dragState.type === 'sw') {
        const right = init.x + init.width;
        const x = Math.round(Math.max(0, Math.min(right - 20, init.x + dx)));
        newBox = {
          x,
          y: init.y,
          width: right - x,
          height: Math.round(Math.max(20, Math.min(maxY - init.y, init.height + dy))),
        };
      } else if (dragState.type === 'e') {
        newBox = {
          ...init,
          width: Math.round(Math.max(20, Math.min(maxX - init.x, init.width + dx))),
        };
      } else if (dragState.type === 'w') {
        const right = init.x + init.width;
        const x = Math.round(Math.max(0, Math.min(right - 20, init.x + dx)));
        newBox = {
          ...init,
          x,
          width: right - x,
        };
      } else if (dragState.type === 's') {
        newBox = {
          ...init,
          height: Math.round(Math.max(20, Math.min(maxY - init.y, init.height + dy))),
        };
      } else if (dragState.type === 'n') {
        const bottom = init.y + init.height;
        const y = Math.round(Math.max(0, Math.min(bottom - 20, init.y + dy)));
        newBox = {
          ...init,
          y,
          height: bottom - y,
        };
      }

      latestDragBoxRef.current = newBox;

      // Throttle live visual coordinates to display refresh rate (60/120Hz)
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (latestDragBoxRef.current) {
            setLiveDragBox(latestDragBoxRef.current);
            const targetObj = pageObjectsRef.current.find((o) => o.id === dragState.objectId);
            if (targetObj) {
              // Pass reorder: false during active drag to prevent array reshuffling and DOM jank!
              onUpdateObjectRef.current({ ...targetObj, box: latestDragBoxRef.current }, false);
            }
          }
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;

      if (canvasRef.current && dragState) {
        const targetObj = pageObjectsRef.current.find((o) => o.id === dragState.objectId);
        if (targetObj) {
          const finalBox = latestDragBoxRef.current || targetObj.box;
          const newCrop = cropRegionFromCanvas(canvasRef.current, finalBox);
          const newRawText = extractTextInBox(extractedTextsRef.current, finalBox);
          const textToUse = newRawText || targetObj.rawText || '';

          // Re-generate live formatted markdown for the newly moved region!
          const updatedMarkdown = formatInstantMarkdown(
            textToUse,
            targetObj.conversionType,
            newCrop
          );

          // Now commit final box with reorder: true on drop!
          onUpdateObjectRef.current({
            ...targetObj,
            box: finalBox,
            cropImageDataUrl: newCrop,
            rawText: textToUse,
            markdownResult: updatedMarkdown,
          }, true);
        }
      }
      latestDragBoxRef.current = null;
      setLiveDragBox(null);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState]);

  const handleToggleLockObject = useCallback((objectId: string) => {
    const target = pageObjects.find((o) => o.id === objectId);
    if (!target) return;
    onUpdateObject({
      ...target,
      isLocked: !target.isLocked,
    });
  }, [pageObjects, onUpdateObject]);

  const handleStartDrag = (
    e: React.MouseEvent,
    objectId: string,
    handleType: DragHandleType
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const targetObj = pageObjects.find((o) => o.id === objectId);
    if (!targetObj) return;

    onSelectObject(objectId);

    // If the object is locked, prohibit moving and resizing!
    if (targetObj.isLocked) {
      return;
    }

    const initialBox = { ...targetObj.box };
    setLiveDragBox(initialBox);
    latestDragBoxRef.current = initialBox;
    setDragState({
      type: handleType,
      objectId,
      startX: e.clientX,
      startY: e.clientY,
      initialBox,
    });
  };

  // Render current page when pdfDoc, currentPage or zoom changes
  useEffect(() => {
    let isCancelled = false;
    if (!pdfDoc || !canvasRef.current) return;

    async function loadAndRender() {
      setIsLoadingPage(true);
      try {
        const result = await renderPage(pdfDoc, currentPage, canvasRef.current!, zoom);
        if (!isCancelled) {
          setViewportDims({
            width: result.viewportWidth,
            height: result.viewportHeight,
          });
          setExtractedTexts(result.textItems);
          setPageImageBase64(result.pageImageBase64);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPage(false);
        }
      }
    }

    loadAndRender();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoom]);

  // Handle Box Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionMode !== 'box' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectionMode === 'text') {
      // Find text item under cursor
      const found = extractedTexts.find(
        (item) =>
          x >= item.x &&
          x <= item.x + item.width &&
          y >= item.y &&
          y <= item.y + item.height
      );
      setHoveredTextItem(found || null);
      return;
    }

    if (!isDrawing || !startPoint) return;

    const boxX = Math.min(startPoint.x, x);
    const boxY = Math.min(startPoint.y, y);
    const boxWidth = Math.abs(x - startPoint.x);
    const boxHeight = Math.abs(y - startPoint.y);

    setCurrentBox({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !canvasRef.current) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    // Only create box if larger than minimal threshold
    if (currentBox.width > 15 && currentBox.height > 15) {
      const cropData = cropRegionFromCanvas(canvasRef.current, currentBox);
      const rawText = extractTextInBox(extractedTexts, currentBox);

      // Guess initial type heuristic
      let guessedType: ConversionType = 'auto_detect';
      if (rawText.includes('|') || currentBox.width > 250 && currentBox.height > 100) {
        guessedType = 'table';
      } else if (currentBox.height < 45 && currentBox.width > 80) {
        guessedType = 'heading_2';
      }

      const initialMd = formatInstantMarkdown(rawText.trim(), guessedType, cropData);

      const newObject: PDFObjectItem = {
        id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pageNumber: currentPage,
        box: currentBox,
        conversionType: guessedType,
        cropImageDataUrl: cropData,
        rawText: rawText.trim(),
        markdownResult: initialMd,
      };

      onAddObject(newObject);
      onSelectObject(newObject.id);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  // Click on a text token in text-selection mode
  const handleTextItemClick = (item: ExtractedTextItem) => {
    if (!canvasRef.current) return;

    const padding = 6;
    const box: BoundingBox = {
      x: Math.max(0, item.x - padding),
      y: Math.max(0, item.y - padding),
      width: item.width + padding * 2,
      height: item.height + padding * 2,
    };

    const cropData = cropRegionFromCanvas(canvasRef.current, box);
    const targetType: ConversionType = item.height > 16 ? 'heading_2' : 'paragraph';
    const initialMd = formatInstantMarkdown(item.text, targetType, cropData);

    const newObj: PDFObjectItem = {
      id: `text-obj-${Date.now()}`,
      pageNumber: currentPage,
      box,
      conversionType: targetType,
      cropImageDataUrl: cropData,
      rawText: item.text,
      markdownResult: initialMd,
    };

    onAddObject(newObj);
    onSelectObject(newObj.id);
  };

  const handleTriggerAutoDetect = () => {
    if (pageImageBase64) {
      onTriggerAutoDetectPage(
        pageImageBase64,
        extractedTexts,
        viewportDims.width,
        viewportDims.height
      );
    }
  };

  const handleQuickAutoSegment = (granularity: SegmentationGranularity = 'semantic') => {
    if (!canvasRef.current || extractedTexts.length === 0) return;
    setIsQuickSegmenting(true);

    try {
      const { objects, summary } = autoSegmentPageContent(
        extractedTexts,
        canvasRef.current,
        currentPage,
        {
          granularity,
          padding: 6,
          viewportWidth: viewportDims.width,
          viewportHeight: viewportDims.height,
        }
      );

      if (objects.length > 0) {
        if (onBatchSetPageObjects) {
          const desc = `已快速自動框選 ${summary.total} 個物件（標題 ${summary.headings}、表格 ${summary.tables}、段落 ${summary.paragraphs}、公式 ${summary.math}、程式碼 ${summary.code}）`;
          onBatchSetPageObjects(currentPage, objects, desc);
        } else {
          objects.forEach((o) => onAddObject(o));
        }
        onSelectObject(objects[0].id);
      }
    } catch (err) {
      console.error('Quick segment failed:', err);
    } finally {
      setIsQuickSegmenting(false);
      setShowAutoMenu(false);
    }
  };

  // Notice state for recent auto alignment
  const [alignedNoticeId, setAlignedNoticeId] = useState<string | null>(null);

  // Automatically snap object position & size to underlying text or graphics
  const handleAutoAlignObject = useCallback(
    (objectId: string) => {
      const targetObj = pageObjects.find((o) => o.id === objectId);
      if (!targetObj || !canvasRef.current) return;

      const alignResult = calculateAutoAlignedBox(
        targetObj.box,
        extractedTexts,
        canvasRef.current
      );

      if (!alignResult) return;

      const newBox = alignResult.box;
      const newCrop = cropRegionFromCanvas(canvasRef.current, newBox);
      const newRawText = extractTextInBox(extractedTexts, newBox);
      const textToUse = newRawText || targetObj.rawText || '';

      const updatedMarkdown = formatInstantMarkdown(
        textToUse,
        targetObj.conversionType,
        newCrop
      );

      onUpdateObject({
        ...targetObj,
        box: newBox,
        cropImageDataUrl: newCrop,
        rawText: textToUse,
        markdownResult: updatedMarkdown,
      });

      // Show brief visual feedback indicator
      setAlignedNoticeId(objectId);
      setTimeout(() => {
        setAlignedNoticeId((prev) => (prev === objectId ? null : prev));
      }, 2000);
    },
    [pageObjects, extractedTexts, onUpdateObject]
  );

  // Register auto-align function to parent if requested
  const handleAutoAlignObjectRef = useRef(handleAutoAlignObject);
  handleAutoAlignObjectRef.current = handleAutoAlignObject;

  useEffect(() => {
    if (onRegisterAutoAlign) {
      onRegisterAutoAlign((objectId: string) => {
        handleAutoAlignObjectRef.current(objectId);
      });
      return () => {
        onRegisterAutoAlign(null);
      };
    }
  }, [onRegisterAutoAlign]);

  // Keyboard shortcut: Press 'a' or 'A' when an object is selected to auto-align
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedObjectId) return;
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleAutoAlignObject(selectedObjectId);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleToggleLockObject(selectedObjectId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedObjectId, handleAutoAlignObject, handleToggleLockObject]);

  // Fit current page width to the scrollable container
  const handleFitToWidth = () => {
    if (!containerRef.current || viewportDims.width <= 0) return;
    const availableWidth = containerRef.current.clientWidth - 48;
    const unscaledWidth = viewportDims.width / zoom;
    if (unscaledWidth <= 0) return;
    const targetZoom = Math.min(2.5, Math.max(0.6, Math.round((availableWidth / unscaledWidth) * 10) / 10));
    onZoomChange(targetZoom);
  };

  // Ctrl/Cmd + Wheel to Zoom in/out smoothly without layout distortion
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.min(2.5, Math.max(0.6, Math.round((zoom + delta) * 10) / 10));
        if (newZoom !== zoom) {
          onZoomChange(newZoom);
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, onZoomChange]);

  // Register PDF viewer actions to parent with ref forwarding to prevent re-render loops
  const pdfActionsRef = useRef<PdfViewerActions>({
    quickAutoSegment: handleQuickAutoSegment,
    triggerAutoDetect: handleTriggerAutoDetect,
    fitToWidth: handleFitToWidth,
    toggleLock: handleToggleLockObject,
    autoAlign: handleAutoAlignObject,
  });
  pdfActionsRef.current = {
    quickAutoSegment: handleQuickAutoSegment,
    triggerAutoDetect: handleTriggerAutoDetect,
    fitToWidth: handleFitToWidth,
    toggleLock: handleToggleLockObject,
    autoAlign: handleAutoAlignObject,
  };

  useEffect(() => {
    if (onRegisterPdfActions) {
      onRegisterPdfActions({
        quickAutoSegment: (granularity) => pdfActionsRef.current.quickAutoSegment(granularity),
        triggerAutoDetect: () => pdfActionsRef.current.triggerAutoDetect(),
        fitToWidth: () => pdfActionsRef.current.fitToWidth(),
        toggleLock: (objectId) => pdfActionsRef.current.toggleLock(objectId),
        autoAlign: (objectId) => pdfActionsRef.current.autoAlign(objectId),
      });
      return () => {
        onRegisterPdfActions(null);
      };
    }
  }, [onRegisterPdfActions]);

  // Count objects on current page by category for the color legend
  const categoryCounts = useMemo(() => {
    let heading = 0;
    let table = 0;
    let math = 0;
    let code = 0;
    let paragraph = 0;

    pageObjects.forEach((obj) => {
      const type = obj.conversionType;
      if (type.startsWith('heading_')) heading++;
      else if (type === 'table') table++;
      else if (type === 'latex_math') math++;
      else if (type === 'code') code++;
      else if (type === 'paragraph') paragraph++;
    });

    return { heading, table, math, code, paragraph, total: pageObjects.length };
  }, [pageObjects]);

  // Click on a category in the legend to jump-select an object of that category
  const handleSelectCategory = (cat: 'heading' | 'table' | 'math' | 'code' | 'paragraph') => {
    const match = pageObjects.find((obj) => {
      if (cat === 'heading') return obj.conversionType.startsWith('heading_');
      if (cat === 'table') return obj.conversionType === 'table';
      if (cat === 'math') return obj.conversionType === 'latex_math';
      if (cat === 'code') return obj.conversionType === 'code';
      if (cat === 'paragraph') return obj.conversionType === 'paragraph';
      return false;
    });
    if (match) {
      onSelectObject(match.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Main Body Area: Optional PDF Page List Sidebar + Canvas Scroll Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {showPageList && (
          <PdfPageListSidebar
            pdfDoc={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={onPageChange}
            allPagesObjects={allPagesObjects}
            selectedObjectId={selectedObjectId}
            onSelectObject={onSelectObject}
            initialTab={sidebarTab}
            onClose={() => setShowPageList(false)}
          />
        )}

        {/* Main Canvas Scroll Area */}
        <div
          ref={containerRef}
          onClick={() => onSelectObject(null)}
          className="flex-1 overflow-auto p-6 flex justify-center items-start select-none bg-slate-950/90 relative"
        >
          {/* Floating Category Color Legend Pill */}
          <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 shadow-xl text-[11px] text-slate-300 pointer-events-auto">
            <Palette className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 font-medium">標記色彩：</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory('heading');
              }}
              className="flex items-center gap-1 hover:text-purple-300 transition cursor-pointer"
              title="標題類別 (紫色) - 點擊快速選取"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>標題</span>
              {categoryCounts.heading > 0 && (
                <span className="font-mono text-[9px] bg-purple-900/80 px-1 rounded-full font-bold text-purple-200">
                  {categoryCounts.heading}
                </span>
              )}
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory('table');
              }}
              className="flex items-center gap-1 hover:text-emerald-300 transition cursor-pointer"
              title="表格類別 (綠色) - 點擊快速選取"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>表格</span>
              {categoryCounts.table > 0 && (
                <span className="font-mono text-[9px] bg-emerald-900/80 px-1 rounded-full font-bold text-emerald-200">
                  {categoryCounts.table}
                </span>
              )}
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory('math');
              }}
              className="flex items-center gap-1 hover:text-rose-300 transition cursor-pointer"
              title="公式類別 (玫瑰紅) - 點擊快速選取"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>公式</span>
              {categoryCounts.math > 0 && (
                <span className="font-mono text-[9px] bg-rose-900/80 px-1 rounded-full font-bold text-rose-200">
                  {categoryCounts.math}
                </span>
              )}
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory('code');
              }}
              className="flex items-center gap-1 hover:text-amber-300 transition cursor-pointer"
              title="程式碼類別 (琥珀金) - 點擊快速選取"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>程式碼</span>
              {categoryCounts.code > 0 && (
                <span className="font-mono text-[9px] bg-amber-900/80 px-1 rounded-full font-bold text-amber-200">
                  {categoryCounts.code}
                </span>
              )}
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory('paragraph');
              }}
              className="flex items-center gap-1 hover:text-sky-300 transition cursor-pointer"
              title="段落類別 (天藍色) - 點擊快速選取"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>內文</span>
              {categoryCounts.paragraph > 0 && (
                <span className="font-mono text-[9px] bg-sky-900/80 px-1 rounded-full font-bold text-sky-200">
                  {categoryCounts.paragraph}
                </span>
              )}
            </button>
          </div>
        <div
          className="relative shadow-2xl rounded-sm"
          style={{
            cursor:
              selectionMode === 'box'
                ? 'crosshair'
                : selectionMode === 'text'
                ? 'pointer'
                : 'default',
          }}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              onSelectObject(null);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Underlying PDF Render Canvas */}
          <canvas
            ref={canvasRef}
            className="block rounded-sm bg-white shadow-xl ring-1 ring-slate-800"
          />

          {/* Loading overlay for page rendering */}
          {isLoadingPage && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center rounded-sm">
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-medium">渲染 PDF 頁面中...</span>
              </div>
            </div>
          )}

          {/* Text layer hover highlights in 'text' mode */}
          {selectionMode === 'text' && hoveredTextItem && (
            <div
              onClick={() => handleTextItemClick(hoveredTextItem)}
              className="absolute border border-indigo-400 bg-indigo-500/20 rounded pointer-events-auto transition cursor-pointer"
              style={{
                left: `${hoveredTextItem.x}px`,
                top: `${hoveredTextItem.y}px`,
                width: `${hoveredTextItem.width}px`,
                height: `${hoveredTextItem.height}px`,
              }}
            />
          )}

          {/* Existing Page Objects Bounding Box Overlays */}
          {pageObjects.map((obj, index) => {
            const isSelected = obj.id === selectedObjectId;
            const isDraggingThis = dragState?.objectId === obj.id;
            const displayBox = isDraggingThis && liveDragBox ? liveDragBox : obj.box;
            const theme = getObjectTheme(obj);
            const config =
              CONVERSION_TYPE_CONFIGS[obj.conversionType] ||
              CONVERSION_TYPE_CONFIGS.paragraph;
            const Icon = config.icon;
            const isNearTop = displayBox.y < 26;

            return (
              <div
                key={obj.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject(obj.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleStartDrag(e, obj.id, 'move');
                }}
                className={`absolute rounded select-none ${
                  isDraggingThis
                    ? `border-2 ${theme.borderBox} ring-2 ${theme.ringBox} shadow-2xl ${theme.shadowBox} cursor-move z-30 transition-none opacity-95 bg-indigo-500/20`
                    : isSelected
                    ? `border-2 ${theme.borderBox} ring-2 ${theme.ringBox} shadow-xl ${theme.shadowBox} ${
                        obj.isLocked ? 'cursor-default' : 'cursor-move'
                      } z-25 transition-colors transition-shadow ${theme.bgBox}`
                    : `border ${theme.borderBox} ${theme.bgBox} ${theme.bgBoxHover} hover:border-2 hover:shadow-xs cursor-pointer z-10 transition-colors transition-shadow`
                }`}
                style={{
                  left: `${displayBox.x}px`,
                  top: `${displayBox.y}px`,
                  width: `${displayBox.width}px`,
                  height: `${displayBox.height}px`,
                  zIndex: isDraggingThis ? 30 : isSelected ? 25 : 10,
                }}
                title={!isSelected ? `${config.label} (#${index + 1}) - 點擊以選取物件` : undefined}
              >
                {/* 只有被選中的物件才顯示標註標題區塊與快捷動作 (未被選取的物件直接隱藏標題區塊) */}
                {isSelected && (
                  <>
                    {/* Object Badge with Signature Category Color */}
                    <div
                      className={`absolute ${isNearTop ? 'top-1' : '-top-6'} left-0 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold shadow-md pointer-events-auto z-30 ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot} shrink-0`} />
                      <Icon className="w-3 h-3" />
                      <span className="font-mono">#{index + 1}</span>
                      <span>{config.shortLabel}</span>

                      {obj.markdownResult && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" title="已完成轉換" />
                      )}

                      {/* Locked status notification badge */}
                      {obj.isLocked && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/40"
                          title="物件已鎖定，禁止移動或調整大小"
                        >
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          已鎖定
                        </span>
                      )}

                      {/* Recently auto-aligned notification */}
                      {alignedNoticeId === obj.id && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-medium border border-emerald-500/40">
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          已對齊
                        </span>
                      )}
                    </div>

                    {/* Quick actions for selected object */}
                    <div
                      className={`absolute ${isNearTop ? 'top-1' : '-top-6'} right-0 flex items-center gap-1 pointer-events-auto z-30`}
                    >
                      {/* Lock / Unlock Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLockObject(obj.id);
                        }}
                        className={`p-1 rounded shadow-xs cursor-pointer transition hover:scale-105 ${
                          obj.isLocked
                            ? 'bg-amber-600 hover:bg-amber-500 ring-1 ring-amber-400 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                        title={
                          obj.isLocked
                            ? '解除鎖定 (允許拖曳與縮放)'
                            : '鎖定物件 (禁止拖曳或縮放，快捷鍵 L)'
                        }
                      >
                        {obj.isLocked ? (
                          <Lock className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <Unlock className="w-2.5 h-2.5" />
                        )}
                      </button>

                      {/* Auto-Align Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoAlignObject(obj.id);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition hover:scale-105 text-[10px] font-medium"
                        title="自動對齊物件 (貼齊內容位置與大小，快捷鍵 A)"
                      >
                        <ScanLine className="w-2.5 h-2.5" />
                        {obj.box.width >= 160 && <span>自動對齊</span>}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerConvert(obj);
                        }}
                        className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer transition hover:scale-105"
                        title="立即轉換"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteObject(obj.id);
                        }}
                        className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer transition hover:scale-105"
                        title="刪除"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </>
                )}

                {/* Live coordinate indicator during drag */}
                {isSelected && isDraggingThis && (
                  <div className="absolute -bottom-6 left-0 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300 text-[10px] font-mono shadow-md whitespace-nowrap pointer-events-none z-30 transition-none">
                    X: {Math.round(displayBox.x)} · Y: {Math.round(displayBox.y)} ({Math.round(displayBox.width)}×{Math.round(displayBox.height)}px)
                  </div>
                )}

                {/* 8-point Resize Handles matching Category Color (visible when selected and NOT locked) */}
                {isSelected && !obj.isLocked && (
                  <>
                    {/* Corners */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'nw')}
                      className={`absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-nwse-resize z-30`}
                      title="調整左上角大小"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'ne')}
                      className={`absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-nesw-resize z-30`}
                      title="調整右上角大小"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'se')}
                      className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-nwse-resize z-30`}
                      title="調整右下角大小"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'sw')}
                      className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-nesw-resize z-30`}
                      title="調整左下角大小"
                    />

                    {/* Edge Midpoints */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'n')}
                      className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-ns-resize z-30`}
                      title="調整頂部高度"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 's')}
                      className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-ns-resize z-30`}
                      title="調整底部高度"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'w')}
                      className={`absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-ew-resize z-30`}
                      title="調整左側寬度"
                    />
                    <div
                      onMouseDown={(e) => handleStartDrag(e, obj.id, 'e')}
                      className={`absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 ${theme.handleBorder} rounded-sm shadow-md cursor-ew-resize z-30`}
                      title="調整右側寬度"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Currently drawing bounding box */}
          {isDrawing && currentBox && (
            <div
              className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/20 pointer-events-none rounded shadow-sm"
              style={{
                left: `${currentBox.x}px`,
                top: `${currentBox.y}px`,
                width: `${currentBox.width}px`,
                height: `${currentBox.height}px`,
                zIndex: 30,
              }}
            >
              <div className="absolute -top-5 left-0 px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[10px] font-mono shadow">
                選取中...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
