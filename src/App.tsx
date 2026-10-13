import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PDFObjectItem, ExtractedTextItem, ConversionType, WorkspaceProjectData, ThemeMode } from './types';
import { loadPdf, extractPdfVersion } from './utils/pdfRenderer';
import {
  generateResearchPaperSample,
  generateInvoiceReportSample,
} from './utils/samplePdf';
import {
  convertObjectApi,
  detectPageObjectsApi,
  convertFullPageApi,
} from './utils/api';
import { formatInstantMarkdown } from './utils/markdownFormatter';
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  saveWorkspaceToFile,
  parseWorkspaceFile,
  saveAutosaveDraft,
} from './utils/workspaceStorage';
import { LayoutBar } from './components/LayoutBar';
import { Navbar, ViewLayout } from './components/Navbar';
import { PdfCanvasViewer, PdfViewerActions, SelectionMode } from './components/PdfCanvasViewer';
import { RightSidebar } from './components/RightSidebar';
import { MarkdownWorkspace, MarkdownWorkspaceActions } from './components/MarkdownWorkspace';
import { StatusBar } from './components/StatusBar';
import { SegmentationGranularity } from './utils/autoSegmenter';
import { Sparkles, UploadCloud, FileUp, CheckCircle2, AlertTriangle, PanelRightOpen } from 'lucide-react';

export default function App() {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPdfBase64, setCurrentPdfBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('AI-MultiModal-Paper.pdf');
  const [fileSize, setFileSize] = useState<number>(0);
  const [pdfVersion, setPdfVersion] = useState<string>('PDF 1.4');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.2);
  const [viewLayout, setViewLayout] = useState<ViewLayout>('split');
  const [splitMarkdownTab, setSplitMarkdownTab] = useState<'preview' | 'split' | 'raw' | 'outline'>('preview');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);

  // Theme Mode (Dark / Light / System, default 'dark')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('pdfmd_theme_mode');
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'dark'; // Default: Dark Mode
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = useMemo<'dark' | 'light'>(() => {
    if (themeMode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

  useEffect(() => {
    try {
      localStorage.setItem('pdfmd_theme_mode', themeMode);
    } catch {
      // Ignore
    }
    if (resolvedTheme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark', 'dark');
    } else {
      document.documentElement.classList.add('theme-dark', 'dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeMode, resolvedTheme]);

  // Compute active markdown tab depending on the 5 viewLayout modes
  const currentMarkdownTab = useMemo(() => {
    if (viewLayout === 'markdown_preview') return 'preview';
    if (viewLayout === 'markdown_split') return 'split';
    if (viewLayout === 'markdown_raw') return 'raw';
    return splitMarkdownTab;
  }, [viewLayout, splitMarkdownTab]);

  const handleMarkdownTabChange = (newTab: 'preview' | 'split' | 'raw' | 'outline') => {
    setSplitMarkdownTab(newTab);
    if (viewLayout === 'markdown_preview' || viewLayout === 'markdown_split' || viewLayout === 'markdown_raw') {
      if (newTab === 'preview') setViewLayout('markdown_preview');
      else if (newTab === 'split') setViewLayout('markdown_split');
      else if (newTab === 'raw') setViewLayout('markdown_raw');
    }
  };

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Map of pageNumber -> PDFObjectItem[]
  const [allPagesObjects, setAllPagesObjects] = useState<Record<number, PDFObjectItem[]>>({});
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Automatically open RightSidebar when an object is selected
  useEffect(() => {
    if (selectedObjectId) {
      setIsRightSidebarOpen(true);
    }
  }, [selectedObjectId]);

  // Statuses
  const [isBatchConverting, setIsBatchConverting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [isDetectingObjects, setIsDetectingObjects] = useState(false);
  const [isConvertingFullPage, setIsConvertingFullPage] = useState(false);
  const [fullPageMarkdown, setFullPageMarkdown] = useState<string>('');

  // Unified Toolbar State & Actions (using Refs to avoid maximum update depth loops)
  const [showPageList, setShowPageList] = useState<boolean>(true);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('box');
  const pdfActionsRef = useRef<PdfViewerActions | null>(null);
  const markdownActionsRef = useRef<MarkdownWorkspaceActions | null>(null);
  const [canInsertToc, setCanInsertToc] = useState<boolean>(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const handleRegisterPdfActions = useCallback((actions: PdfViewerActions | null) => {
    pdfActionsRef.current = actions;
  }, []);

  const handleRegisterMarkdownActions = useCallback((actions: MarkdownWorkspaceActions | null) => {
    markdownActionsRef.current = actions;
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (markdownActionsRef.current) {
      markdownActionsRef.current.copy();
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  }, []);

  const handleDownloadMarkdown = useCallback(() => {
    markdownActionsRef.current?.download();
  }, []);

  const handleInsertToc = useCallback(() => {
    markdownActionsRef.current?.insertToc();
  }, []);

  const handleQuickAutoSegment = useCallback((granularity: SegmentationGranularity) => {
    pdfActionsRef.current?.quickAutoSegment(granularity);
  }, []);

  const handleTriggerAutoDetect = useCallback(() => {
    pdfActionsRef.current?.triggerAutoDetect();
  }, []);

  const handleFitToWidth = useCallback(() => {
    pdfActionsRef.current?.fitToWidth();
  }, []);

  const handleToggleLockSelected = useCallback(() => {
    if (selectedObjectId) {
      pdfActionsRef.current?.toggleLock(selectedObjectId);
    }
  }, [selectedObjectId]);

  const handleAutoAlignSelected = useCallback(() => {
    if (selectedObjectId) {
      pdfActionsRef.current?.autoAlign(selectedObjectId);
    }
  }, [selectedObjectId]);

  // Drag-and-drop indicator
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Helper to load binary PDF buffer with optional preset objects for immediate realistic preview
  const loadPdfBytes = useCallback(async (
    data: Uint8Array | ArrayBuffer,
    name: string,
    presetObjects?: Record<number, PDFObjectItem[]>,
    explicitVersion?: string
  ) => {
    try {
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const b64 = uint8ArrayToBase64(u8);
      setCurrentPdfBase64(b64);
      setFileSize(u8.byteLength);

      const doc = await loadPdf(u8);
      setPdfDoc(doc);
      setFileName(name);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setAllPagesObjects(presetObjects || {});
      setSelectedObjectId(presetObjects?.[1]?.[0]?.id || null);
      setFullPageMarkdown('');

      // Detect and record PDF loaded specification version (e.g. PDF 1.3, PDF 1.4)
      const detectedVersion = explicitVersion || (await extractPdfVersion(u8, doc));
      setPdfVersion(detectedVersion);
    } catch (err: any) {
      console.error('Failed to load PDF bytes:', err);
      setToast({
        message: `PDF 解析失敗：${err?.message || '檔案可能損毀、受密碼保護或格式不相容'}`,
        type: 'error',
      });
      throw err;
    }
  }, []);

  // Initial load: generate and load default research paper sample with high-fidelity preset objects
  useEffect(() => {
    const sampleBytes = generateResearchPaperSample();

    const initialSampleObjects: Record<number, PDFObjectItem[]> = {
      1: [
        {
          id: 'preset-obj-1',
          pageNumber: 1,
          box: { x: 50, y: 55, width: 620, height: 42 },
          conversionType: 'heading_1',
          rawText: 'Multi-Modal Document Parsing with Intelligent Object Segmentations',
          markdownResult: '# Multi-Modal Document Parsing with Intelligent Object Segmentations\n\n> **作者**：Dr. Alexander Vance (AI Systems Laboratory) · **發佈日期**：2025-05-18',
        },
        {
          id: 'preset-obj-2',
          pageNumber: 1,
          box: { x: 50, y: 135, width: 620, height: 75 },
          conversionType: 'paragraph',
          rawText: '1. ABSTRACT\nModern document parsing requires selective transformation of diverse entities, such as dense mathematical formulations, tabular records, multi-column blocks, and code snippets into unified Markdown documentation.',
          markdownResult: '### 1. ABSTRACT\n\nModern document parsing requires selective transformation of diverse entities, such as dense mathematical formulations, tabular records, multi-column blocks, and code snippets into unified Markdown documentation.',
        },
        {
          id: 'preset-obj-3',
          pageNumber: 1,
          box: { x: 50, y: 220, width: 620, height: 70 },
          conversionType: 'latex_math',
          rawText: 'L(theta) = alpha * CrossEntropy(y, y_hat) + beta * SmoothL1(b - b_hat)',
          markdownResult: '### 2. MATHEMATICAL FORMULATION\n\n損失函數結合跨模態外框定位與分類：\n\n$$\n\\mathcal{L}(\\theta) = \\alpha \\cdot \\text{CrossEntropy}(y, \\hat{y}) + \\beta \\cdot \\text{Smooth}_{L1}(b - \\hat{b})\n$$\n\n其中 $\\theta$ 代表模型訓練參數，$\\alpha$ 與 $\\beta$ 則為平衡損失之權重因子。',
        },
        {
          id: 'preset-obj-4',
          pageNumber: 1,
          box: { x: 50, y: 310, width: 620, height: 110 },
          conversionType: 'table',
          rawText: 'Model Name | Precision (%) | Recall (%) | F1-Score | Latency (ms)\nDocLayout-V1 | 89.4 | 87.2 | 88.3 | 45.2\nGemini-Flash-3.8 | 98.7 | 97.9 | 98.3 | 18.4\nLegacy OCR Tool | 74.1 | 71.5 | 72.8 | 120.0',
          markdownResult: '### 3. EXPERIMENTAL COMPARISON TABLE\n\n| 模型架構 (Model) | 精確率 Precision (%) | 召回率 Recall (%) | F1-Score | 推論延遲 Latency (ms) |\n|---|---|---|---|---|\n| **DocLayout-V1** | 89.4% | 87.2% | 88.3 | 45.2 ms |\n| **Gemini-Flash-3.8** | **98.7%** | **97.9%** | **98.3** | **18.4 ms** |\n| **Legacy OCR Tool** | 74.1% | 71.5% | 72.8 | 120.0 ms |',
        },
        {
          id: 'preset-obj-5',
          pageNumber: 1,
          box: { x: 50, y: 440, width: 620, height: 95 },
          conversionType: 'code',
          rawText: 'def extract_markdown(region_crop, target_type):\n    response = gemini_client.models.generate_content(model="gemini-3.8-flash", contents=[region_crop, target_type])\n    return response.text',
          markdownResult: '### 4. IMPLEMENTATION SNIPPET (PYTHON)\n\n```python\n# 核心物件轉換程式碼\ndef extract_markdown(region_crop: bytes, target_type: str) -> str:\n    response = gemini_client.models.generate_content(\n        model="gemini-3.8-flash",\n        contents=[region_crop, f"轉換為指定格式: {target_type}"]\n    )\n    return response.text\n```',
        },
      ],
    };

    loadPdfBytes(sampleBytes, 'AI-MultiModal-Paper.pdf', initialSampleObjects, 'PDF 1.4');
  }, [loadPdfBytes]);

  // Handle sample selection from Navbar with optional target PDF version
  const handleLoadSample = (sampleType: 'paper' | 'invoice', targetVersion: string = '1.4') => {
    setZoom(1.2);
    const cleanVer = targetVersion.replace(/^PDF\s*/i, '').trim() || '1.4';
    const displayVer = `PDF ${cleanVer}`;

    if (sampleType === 'paper') {
      const bytes = generateResearchPaperSample(cleanVer);
      const initialSampleObjects: Record<number, PDFObjectItem[]> = {
        1: [
          {
            id: 'preset-obj-1',
            pageNumber: 1,
            box: { x: 50, y: 55, width: 620, height: 42 },
            conversionType: 'heading_1',
            rawText: 'Multi-Modal Document Parsing with Intelligent Object Segmentations',
            markdownResult: '# Multi-Modal Document Parsing with Intelligent Object Segmentations\n\n> **作者**：Dr. Alexander Vance (AI Systems Laboratory)',
          },
          {
            id: 'preset-obj-3',
            pageNumber: 1,
            box: { x: 50, y: 220, width: 620, height: 70 },
            conversionType: 'latex_math',
            rawText: 'L(theta) = alpha * CrossEntropy(y, y_hat) + beta * SmoothL1(b - b_hat)',
            markdownResult: '### 2. MATHEMATICAL FORMULATION\n\n$$\n\\mathcal{L}(\\theta) = \\alpha \\cdot \\text{CrossEntropy}(y, \\hat{y}) + \\beta \\cdot \\text{Smooth}_{L1}(b - \\hat{b})\n$$',
          },
          {
            id: 'preset-obj-4',
            pageNumber: 1,
            box: { x: 50, y: 310, width: 620, height: 110 },
            conversionType: 'table',
            rawText: 'Model Name | Precision (%) | Recall (%) | F1-Score | Latency (ms)\nDocLayout-V1 | 89.4 | 87.2 | 88.3 | 45.2\nGemini-Flash-3.8 | 98.7 | 97.9 | 98.3 | 18.4',
            markdownResult: '### 3. EXPERIMENTAL COMPARISON TABLE\n\n| 模型 (Model) | 精確率 Precision (%) | 召回率 Recall (%) | F1-Score |\n|---|---|---|---|\n| **DocLayout-V1** | 89.4% | 87.2% | 88.3 |\n| **Gemini-Flash-3.8** | **98.7%** | **97.9%** | **98.3** |',
          },
        ],
      };
      loadPdfBytes(bytes, 'AI-MultiModal-Paper.pdf', initialSampleObjects, displayVer);
      setToast({
        message: `已成功載入論文範例 (${displayVer})`,
        type: 'success',
      });
    } else {
      const bytes = generateInvoiceReportSample(cleanVer);
      const invoiceObjects: Record<number, PDFObjectItem[]> = {
        1: [
          {
            id: 'inv-obj-1',
            pageNumber: 1,
            box: { x: 50, y: 55, width: 620, height: 50 },
            conversionType: 'heading_1',
            rawText: 'INVOICE & FINANCIAL REPORT - Q3 2025',
            markdownResult: '# INVOICE & FINANCIAL REPORT - Q3 2025\n\n**開立公司**：CloudTech Innovations Inc. · **發票號碼**：INV-2025-09842',
          },
          {
            id: 'inv-obj-2',
            pageNumber: 1,
            box: { x: 50, y: 130, width: 620, height: 130 },
            conversionType: 'table',
            rawText: 'Item Description | Quantity | Unit Price ($) | Total Amount ($)\nAI Studio Engine Pro | 5 seats | 200.00 | 1,000.00\nServerless OCR Cluster | 120 hrs | 15.50 | 1,860.00\nHigh-Res Storage 2TB | 3 mos | 85.00 | 255.00',
            markdownResult: '### 帳單收費明細表\n\n| 項目說明 (Item Description) | 數量 (Qty) | 單價 (Unit Price) | 總金額 (Total) |\n|---|---|---|---|\n| **AI Studio Engine Pro** | 5 seats | $200.00 | $1,000.00 |\n| **Serverless OCR Cluster** | 120 hrs | $15.50 | $1,860.00 |\n| **High-Res Storage 2TB** | 3 mos | $85.00 | $255.00 |\n| **合計 (Subtotal)** | - | - | **$3,115.00** |',
          },
          {
            id: 'inv-obj-3',
            pageNumber: 1,
            box: { x: 50, y: 280, width: 620, height: 60 },
            conversionType: 'callout_note',
            rawText: 'Important Notice: Please quote INV-2025-09842 in your bank transfer memo.',
            markdownResult: '> [!NOTE]\n> **付款說明與政策**\n> 請於匯款附言中備註帳單編號 `INV-2025-09842`，以加速帳務對帳入帳。',
          },
        ],
      };
      loadPdfBytes(bytes, 'CloudTech-Invoice-Q3-2025.pdf', invoiceObjects, displayVer);
      setToast({
        message: `已成功載入報表範例 (${displayVer})`,
        type: 'success',
      });
    }
  };

  // Switch or reload document with chosen PDF specification version (e.g. PDF 1.3, PDF 1.4)
  const handleSelectPdfVersion = (selectedVer: string) => {
    const cleanVer = selectedVer.replace(/^PDF\s*/i, '').trim() || '1.4';
    const displayVer = `PDF ${cleanVer}`;

    if (fileName.toLowerCase().includes('invoice')) {
      handleLoadSample('invoice', cleanVer);
    } else {
      handleLoadSample('paper', cleanVer);
    }
    setToast({
      message: `已切換並載入 PDF 規格版本：${displayVer}`,
      type: 'success',
    });
  };

  // Handle uploaded file from file input
  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const u8 = new Uint8Array(buffer);
      const detectedVer = await extractPdfVersion(u8);
      await loadPdfBytes(u8, file.name, undefined, detectedVer);
      setToast({
        message: `PDF 檔案「${file.name}」已載入 (規格版本：${detectedVer})！`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed reading file:', err);
      setToast({
        message: '讀取 PDF 失敗，請確認檔案有效',
        type: 'error',
      });
    }
  };

  // Save current workspace project to .pdfmd file
  const handleSaveWorkspace = () => {
    if (!currentPdfBase64) {
      setToast({ message: '尚無開啟的 PDF 內容可儲存', type: 'error' });
      return;
    }

    const projectData: WorkspaceProjectData = {
      format: 'pdfmd_workspace',
      version: 1,
      savedAt: new Date().toISOString(),
      fileName,
      fileSize,
      totalPages,
      currentPage,
      zoom,
      pdfVersion,
      pdfBase64: currentPdfBase64,
      allPagesObjects,
      fullPageMarkdown,
    };

    saveWorkspaceToFile(projectData);
    saveAutosaveDraft(projectData);

    const totalCount = Object.values(allPagesObjects).reduce(
      (acc, list) => acc + list.length,
      0
    );
    setToast({
      message: `工作檔儲存成功！包含 ${totalCount} 個物件標註與 ${totalPages} 頁 PDF。`,
      type: 'success',
    });
  };

  // Open workspace project from .pdfmd or .json file
  const handleOpenWorkspaceFile = async (file: File) => {
    try {
      const text = await file.text();
      const projectData = parseWorkspaceFile(text);

      const pdfBytes = base64ToUint8Array(projectData.pdfBase64);
      await loadPdfBytes(
        pdfBytes,
        projectData.fileName || file.name.replace(/\.pdfmd$/i, '.pdf'),
        projectData.allPagesObjects || {},
        projectData.pdfVersion
      );

      if (projectData.currentPage) {
        setCurrentPage(projectData.currentPage);
      }
      if (projectData.zoom) {
        setZoom(projectData.zoom);
      }
      if (projectData.fullPageMarkdown) {
        setFullPageMarkdown(projectData.fullPageMarkdown);
      }

      const totalCount = Object.values(projectData.allPagesObjects || {}).reduce(
        (acc, list) => acc + list.length,
        0
      );
      setToast({
        message: `工作檔「${projectData.fileName}」已成功開啟！已還原 ${totalCount} 個物件與 PDF。`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to open workspace file:', err);
      setToast({
        message: err.message || '開啟工作檔失敗，請確認檔案格式是否正確',
        type: 'error',
      });
    }
  };

  // Global Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.pdfmd') || file.name.endsWith('.json')) {
      await handleOpenWorkspaceFile(file);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      await handleFileUpload(file);
    }
  };

  // Objects on the current page
  const currentPageObjects = allPagesObjects[currentPage] || [];

  // Smooth zoom scaling handler: scales all annotated objects across all pages proportionally
  // so that marked regions never shift, drift, or misalign ("跑版") when zooming in or out.
  const handleZoomChange = (newZoom: number) => {
    const targetZoom = Math.round(newZoom * 100) / 100;
    if (targetZoom <= 0 || Math.abs(targetZoom - zoom) < 0.001) return;

    const ratio = targetZoom / zoom;
    setZoom(targetZoom);

    setAllPagesObjects((prev) => {
      const next: Record<number, PDFObjectItem[]> = {};
      let changed = false;

      for (const [pg, list] of Object.entries(prev)) {
        const pageNum = Number(pg);
        if (!list || list.length === 0) {
          next[pageNum] = [];
          continue;
        }

        changed = true;
        next[pageNum] = list.map((item) => ({
          ...item,
          box: {
            x: Math.round(item.box.x * ratio * 10) / 10,
            y: Math.round(item.box.y * ratio * 10) / 10,
            width: Math.max(10, Math.round(item.box.width * ratio * 10) / 10),
            height: Math.max(10, Math.round(item.box.height * ratio * 10) / 10),
          },
        }));
      }

      return changed ? next : prev;
    });
  };

  // Currently focused object
  const selectedObject =
    currentPageObjects.find((o) => o.id === selectedObjectId) || null;
  const selectedObjectIndex = currentPageObjects.findIndex(
    (o) => o.id === selectedObjectId
  );
  const isSelectedLocked = !!selectedObject?.isLocked;
  const hasUnconvertedObjects = currentPageObjects.some((o) => !o.markdownResult);

  // CRUD for objects
  const handleAddObject = (newObj: PDFObjectItem) => {
    // Automatically generate live formatted markdown so the preview updates instantly
    const initialMd =
      newObj.markdownResult ||
      formatInstantMarkdown(newObj.rawText, newObj.conversionType, newObj.cropImageDataUrl);

    const readyObj: PDFObjectItem = {
      ...newObj,
      markdownResult: initialMd,
    };

    setAllPagesObjects((prev) => {
      const currentList = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: [...currentList, readyObj],
      };
    });
    setSelectedObjectId(readyObj.id);
  };

  const handleUpdateObject = (updated: PDFObjectItem, reorder: boolean = true) => {
    setAllPagesObjects((prev) => {
      const currentList = prev[currentPage] || [];
      let updatedList = currentList.map((item) =>
        item.id === updated.id ? updated : item
      );
      if (reorder) {
        updatedList = [...updatedList].sort((a, b) => {
          if (Math.abs(a.box.y - b.box.y) > 12) {
            return a.box.y - b.box.y;
          }
          return a.box.x - b.box.x;
        });
      }
      return {
        ...prev,
        [currentPage]: updatedList,
      };
    });
  };

  const handleBatchSetPageObjects = (
    pageNumber: number,
    objects: PDFObjectItem[],
    message?: string
  ) => {
    setAllPagesObjects((prev) => ({
      ...prev,
      [pageNumber]: objects,
    }));
    if (objects.length > 0) {
      setSelectedObjectId(objects[0].id);
    }
    if (message) {
      setToast({
        message,
        type: 'success',
      });
    }
  };

  const handleDeleteObject = (id: string) => {
    setAllPagesObjects((prev) => {
      const next: Record<number, PDFObjectItem[]> = {};
      let changed = false;
      for (const [pg, list] of Object.entries(prev)) {
        const pageNum = Number(pg);
        if (list.some((item) => item.id === id)) {
          next[pageNum] = list.filter((item) => item.id !== id);
          changed = true;
        } else {
          next[pageNum] = list;
        }
      }
      return changed ? next : prev;
    });
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
    setToast({
      message: '已刪除選取的物件',
      type: 'success',
    });
  };

  const handleClearAllObjects = () => {
    setAllPagesObjects({});
    setSelectedObjectId(null);
    setFullPageMarkdown('');
    setToast({
      message: '已成功清除所有標註物件',
      type: 'success',
    });
  };

  const handleClearCurrentPageObjects = () => {
    setAllPagesObjects((prev) => ({
      ...prev,
      [currentPage]: [],
    }));
    setSelectedObjectId(null);
    setToast({
      message: `已清除第 ${currentPage} 頁的所有標註物件`,
      type: 'success',
    });
  };

  const totalObjectCount = Object.values(allPagesObjects).reduce(
    (acc, list) => acc + list.length,
    0
  );

  const handleMoveObject = (id: string, direction: 'up' | 'down') => {
    setAllPagesObjects((prev) => {
      const list = [...(prev[currentPage] || [])];
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      if (direction === 'up' && index > 0) {
        const temp = list[index];
        list[index] = list[index - 1];
        list[index - 1] = temp;
      } else if (direction === 'down' && index < list.length - 1) {
        const temp = list[index];
        list[index] = list[index + 1];
        list[index + 1] = temp;
      }

      return {
        ...prev,
        [currentPage]: list,
      };
    });
  };

  // Convert single object via backend API
  const handleConvertSingleObject = async (item: PDFObjectItem) => {
    handleUpdateObject({ ...item, isConverting: true, error: undefined });

    try {
      const res = await convertObjectApi({
        cropImage: item.cropImageDataUrl,
        rawText: item.rawText,
        conversionType: item.conversionType,
        customInstruction: item.customInstruction,
      });

      handleUpdateObject({
        ...item,
        isConverting: false,
        markdownResult: res.markdown,
        error: undefined,
      });
    } catch (err: any) {
      console.error('Error converting object:', err);
      handleUpdateObject({
        ...item,
        isConverting: false,
        error: err.message || '轉換失敗',
      });
    }
  };

  // Batch convert all pending objects on the current page
  const handleBatchConvertPage = async () => {
    const pendingItems = currentPageObjects.filter(
      (o) => o.conversionType !== 'ignore'
    );
    if (pendingItems.length === 0) return;

    setIsBatchConverting(true);
    setBatchProgress({ current: 0, total: pendingItems.length });

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setBatchProgress({ current: i + 1, total: pendingItems.length });
      await handleConvertSingleObject(item);
    }

    setIsBatchConverting(false);
  };

  // Batch convert across all pages
  const handleBatchConvertAll = async () => {
    const allPending: PDFObjectItem[] = [];
    Object.values(allPagesObjects).forEach((list) => {
      list.forEach((item) => {
        if (item.conversionType !== 'ignore') {
          allPending.push(item);
        }
      });
    });

    if (allPending.length === 0) return;

    setIsBatchConverting(true);
    setBatchProgress({ current: 0, total: allPending.length });

    for (let i = 0; i < allPending.length; i++) {
      const item = allPending[i];
      setBatchProgress({ current: i + 1, total: allPending.length });
      await handleConvertSingleObject(item);
    }

    setIsBatchConverting(false);
  };

  // AI Auto-detect objects and bounding boxes on the current page
  const handleTriggerAutoDetectPage = async (
    pageImage: string,
    textItems: ExtractedTextItem[],
    width: number,
    height: number
  ) => {
    setIsDetectingObjects(true);
    try {
      const result = await detectPageObjectsApi({
        pageImage,
        textItems: textItems.map((t) => ({
          text: t.text,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
        })),
        pageWidth: width,
        pageHeight: height,
      });

      if (result.objects && result.objects.length > 0) {
        const mappedItems: PDFObjectItem[] = result.objects.map((obj) => {
          const guessedType = obj.type || 'auto_detect';
          const instantMd = formatInstantMarkdown(obj.label, guessedType);

          return {
            id: obj.id,
            pageNumber: currentPage,
            box: {
              x: Math.max(0, obj.box.x),
              y: Math.max(0, obj.box.y),
              width: Math.max(10, obj.box.width),
              height: Math.max(10, obj.box.height),
            },
            conversionType: guessedType,
            label: obj.label,
            confidence: obj.confidence,
            rawText: obj.label,
            markdownResult: instantMd,
          };
        });

        setAllPagesObjects((prev) => ({
          ...prev,
          [currentPage]: mappedItems,
        }));

        if (mappedItems.length > 0) {
          setSelectedObjectId(mappedItems[0].id);
        }
      }
    } catch (err) {
      console.error('Auto detect objects error:', err);
    } finally {
      setIsDetectingObjects(false);
    }
  };

  // Full page instant conversion
  const handleTriggerFullPageConvert = async () => {
    if (!pdfDoc) return;
    setIsConvertingFullPage(true);
    try {
      const canvasEl = document.querySelector('canvas') as HTMLCanvasElement;
      if (canvasEl) {
        const pageImg = canvasEl.toDataURL('image/png', 0.95);
        const res = await convertFullPageApi(pageImg);
        setFullPageMarkdown(res.markdown);
      }
    } catch (err) {
      console.error('Error in full page conversion:', err);
    } finally {
      setIsConvertingFullPage(false);
    }
  };

  // Drawer object navigation
  const handleNavigateObject = (direction: 'prev' | 'next') => {
    if (selectedObjectIndex === -1) return;
    if (direction === 'prev' && selectedObjectIndex > 0) {
      setSelectedObjectId(currentPageObjects[selectedObjectIndex - 1].id);
    } else if (
      direction === 'next' &&
      selectedObjectIndex < currentPageObjects.length - 1
    ) {
      setSelectedObjectId(currentPageObjects[selectedObjectIndex + 1].id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-screen w-screen ${
        resolvedTheme === 'light' ? 'theme-light bg-[#ffffff] text-[#37352f]' : 'theme-dark bg-[#191919] text-[#e6e5e3]'
      } overflow-hidden relative select-none transition-colors duration-150`}
    >
      {/* Top Layout Bar (Very top: Left Sidebar Toggle, Centered Layout Modes, Theme Mode Switcher & Right Sidebar Toggle) */}
      <LayoutBar
        showPageList={showPageList}
        onTogglePageList={() => setShowPageList((prev) => !prev)}
        isPdfVisible={viewLayout === 'pdf' || viewLayout === 'split'}
        viewLayout={viewLayout}
        onViewLayoutChange={setViewLayout}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
      />

      {/* Main Feature Toolbar */}
      <Navbar
        fileName={fileName}
        totalPages={totalPages}
        pdfVersion={pdfVersion}
        viewLayout={viewLayout}
        onViewLayoutChange={setViewLayout}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        showPageList={showPageList}
        onTogglePageList={() => setShowPageList((prev) => !prev)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
        onFileUpload={handleFileUpload}
        onLoadSample={handleLoadSample}
        onSelectPdfVersion={handleSelectPdfVersion}
        onSaveWorkspace={handleSaveWorkspace}
        onOpenWorkspace={handleOpenWorkspaceFile}
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
        onQuickAutoSegment={handleQuickAutoSegment}
        onTriggerAutoDetect={handleTriggerAutoDetect}
        isDetectingObjects={isDetectingObjects}
        selectedObjectId={selectedObjectId}
        onAutoAlignSelected={handleAutoAlignSelected}
        onToggleLockSelected={handleToggleLockSelected}
        isSelectedLocked={isSelectedLocked}
        onClearAllObjects={handleClearAllObjects}
        onClearPageObjects={handleClearCurrentPageObjects}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onFitToWidth={handleFitToWidth}
        totalObjectCount={totalObjectCount}
        currentPageObjectCount={currentPageObjects.length}
        onBatchConvertPage={handleBatchConvertPage}
        isBatchConverting={isBatchConverting}
        batchProgress={batchProgress}
        hasUnconvertedObjects={hasUnconvertedObjects}
        onTriggerFullPageConvert={handleTriggerFullPageConvert}
        isConvertingFullPage={isConvertingFullPage}
        onInsertToc={handleInsertToc}
        canInsertToc={canInsertToc}
        onCopyMarkdown={handleCopyMarkdown}
        onDownloadMarkdown={handleDownloadMarkdown}
        copiedMarkdown={copiedMarkdown}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs font-medium text-slate-100 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Area (Left: PDF Viewer | Middle: Markdown Workspace | Right: RightSideBar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: PDF Canvas Viewer */}
        {(viewLayout === 'split' || viewLayout === 'pdf') && (
          <div
            className={`h-full flex flex-col relative transition-all ${
              viewLayout === 'split' ? 'flex-1 min-w-0' : 'flex-1'
            }`}
          >
            <PdfCanvasViewer
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              pdfVersion={pdfVersion}
              onPageChange={setCurrentPage}
              onZoomChange={handleZoomChange}
              pageObjects={currentPageObjects}
              allPagesObjects={allPagesObjects}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onAddObject={handleAddObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              onTriggerConvert={handleConvertSingleObject}
              onTriggerAutoDetectPage={handleTriggerAutoDetectPage}
              isDetectingObjects={isDetectingObjects}
              onClearAllObjects={handleClearAllObjects}
              onClearPageObjects={handleClearCurrentPageObjects}
              totalObjectCount={totalObjectCount}
              onBatchSetPageObjects={handleBatchSetPageObjects}
              isRightSidebarOpen={isRightSidebarOpen}
              onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
              showPageList={showPageList}
              onTogglePageList={() => setShowPageList((prev) => !prev)}
              onRegisterPdfActions={handleRegisterPdfActions}
            />
          </div>
        )}

        {/* Middle/Right Pane: Markdown Workspace */}
        {viewLayout !== 'pdf' && (
          <div
            className={`h-full flex flex-col transition-all ${
              viewLayout === 'split' ? 'flex-1 min-w-0' : 'flex-1'
            }`}
          >
            <MarkdownWorkspace
              pdfDoc={pdfDoc}
              objects={currentPageObjects}
              allPagesObjects={allPagesObjects}
              currentPage={currentPage}
              totalPages={totalPages}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => {
                // If object is on another page, navigate to that page as well
                for (const [pg, objs] of Object.entries(allPagesObjects)) {
                  if (objs.some((o) => o.id === id)) {
                    const pageNum = Number(pg);
                    if (pageNum !== currentPage) {
                      setCurrentPage(pageNum);
                    }
                    break;
                  }
                }
                setSelectedObjectId(id);
              }}
              onPageChange={setCurrentPage}
              onDeleteObject={handleDeleteObject}
              onMoveObject={handleMoveObject}
              onBatchConvertPage={handleBatchConvertPage}
              onBatchConvertAll={handleBatchConvertAll}
              isBatchConverting={isBatchConverting}
              batchProgress={batchProgress}
              fullPageMarkdown={fullPageMarkdown}
              onFullPageMarkdownChange={setFullPageMarkdown}
              onTriggerFullPageConvert={handleTriggerFullPageConvert}
              isConvertingFullPage={isConvertingFullPage}
              onClearAllObjects={handleClearAllObjects}
              activeTab={currentMarkdownTab}
              onActiveTabChange={handleMarkdownTabChange}
              viewLayout={viewLayout}
              onRegisterMarkdownActions={handleRegisterMarkdownActions}
              onCanInsertTocChange={setCanInsertToc}
            />
          </div>
        )}

        {/* Far Right: RightSideBar (Object Configuration & Inspector Sidebar) */}
        {isRightSidebarOpen ? (
          <RightSidebar
            selectedObject={selectedObject}
            currentPageObjects={currentPageObjects}
            onSelectObjectId={setSelectedObjectId}
            onUpdate={handleUpdateObject}
            onDelete={handleDeleteObject}
            onClose={() => {
              setSelectedObjectId(null);
              setIsRightSidebarOpen(false);
            }}
            onConvertNow={handleConvertSingleObject}
            onAutoAlign={handleAutoAlignSelected}
            onNavigate={handleNavigateObject}
            onMoveObject={handleMoveObject}
            onClearPageObjects={handleClearCurrentPageObjects}
            hasPrev={selectedObjectIndex > 0}
            hasNext={selectedObjectIndex < currentPageObjects.length - 1}
            objectIndex={selectedObjectIndex}
            totalObjects={currentPageObjects.length}
            currentPage={currentPage}
          />
        ) : (
          /* Docked icon-only button to expand RightSideBar */
          <button
            type="button"
            onClick={() => setIsRightSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-l-lg bg-slate-900/90 hover:bg-indigo-600 text-slate-400 hover:text-white border-l border-y border-slate-700/80 shadow-xl transition cursor-pointer backdrop-blur-xs flex items-center justify-center group"
            title="展開右側邊欄 (RightSideBar)"
          >
            <PanelRightOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* Global Bottom Status Bar with page navigation, zoom, and fit to width */}
      <StatusBar
        fileName={fileName}
        pdfVersion={pdfVersion}
        onSelectPdfVersion={handleSelectPdfVersion}
        currentPage={currentPage}
        totalPages={totalPages}
        totalObjectCount={totalObjectCount}
        currentPageObjectCount={currentPageObjects.length}
        convertedObjectsCount={currentPageObjects.filter((o) => !!o.markdownResult).length}
        markdownCharCount={fullPageMarkdown ? fullPageMarkdown.length : undefined}
        viewLayout={viewLayout}
        isPdfVisible={viewLayout === 'pdf' || viewLayout === 'split'}
        isDetectingObjects={isDetectingObjects}
        isBatchConverting={isBatchConverting}
        isConvertingFullPage={isConvertingFullPage}
        selectedObjectId={selectedObjectId}
        selectionMode={selectionMode}
        onPageChange={setCurrentPage}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onFitToWidth={handleFitToWidth}
      />

      {/* Global Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-indigo-400 p-8 text-center pointer-events-none">
          <UploadCloud className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white mb-2">
            釋放以載入檔案
          </h2>
          <p className="text-indigo-200 text-sm max-w-md">
            支援拖曳 <strong>PDF 原始文件</strong> 或先前儲存的 <strong>工作檔 (.pdfmd / .json)</strong>，系統將立即還原所有物件與排版進度。
          </p>
        </div>
      )}
    </div>
  );
}
