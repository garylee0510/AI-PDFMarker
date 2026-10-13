import React, { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  BookOpen,
  Receipt,
  Columns2,
  FileCheck2,
  Eye,
  Save,
  FolderOpen,
  ChevronDown,
  Check,
  PanelRightClose,
  PanelRightOpen,
  Columns,
  Code2,
  Crop,
  Type,
  MousePointer,
  RotateCw,
  Zap,
  Sparkles,
  ScanLine,
  Lock,
  Unlock,
  Trash2,
  Layers,
  ListTree,
  Copy,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { SUPPORTED_PDF_VERSIONS } from '../utils/samplePdf';
import { ViewLayout, ThemeMode } from '../types';
import { SegmentationGranularity } from '../utils/autoSegmenter';
import { SelectionMode } from './PdfCanvasViewer';

export type { ViewLayout, ThemeMode };

interface Props {
  // Global & File
  fileName: string;
  totalPages: number;
  pdfVersion?: string;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleType: 'paper' | 'invoice', version?: string) => void;
  onSelectPdfVersion?: (version: string) => void;
  onSaveWorkspace: () => void;
  onOpenWorkspace: (file: File) => void;

  // View Layout
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;

  // Theme Mode (Dark / Light / System, default Dark)
  themeMode?: ThemeMode;
  onThemeModeChange?: (mode: ThemeMode) => void;

  // Sidebars
  showPageList?: boolean;
  onTogglePageList?: () => void;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;

  // PDF controls (when viewLayout === 'pdf' || viewLayout === 'split')
  selectionMode?: SelectionMode;
  onSelectionModeChange?: (mode: SelectionMode) => void;
  onQuickAutoSegment?: (granularity: SegmentationGranularity) => void;
  isQuickSegmenting?: boolean;
  onTriggerAutoDetect?: () => void;
  isDetectingObjects?: boolean;
  selectedObjectId?: string | null;
  onAutoAlignSelected?: () => void;
  onToggleLockSelected?: () => void;
  isSelectedLocked?: boolean;
  onClearAllObjects?: () => void;
  onClearPageObjects?: () => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onFitToWidth?: () => void;
  totalObjectCount?: number;
  currentPageObjectCount?: number;

  // Markdown controls (when viewLayout !== 'pdf')
  onBatchConvertPage?: () => void;
  isBatchConverting?: boolean;
  batchProgress?: { current: number; total: number };
  hasUnconvertedObjects?: boolean;
  onTriggerFullPageConvert?: () => void;
  isConvertingFullPage?: boolean;
  onInsertToc?: () => void;
  canInsertToc?: boolean;
  onCopyMarkdown?: () => void;
  onDownloadMarkdown?: () => void;
  copiedMarkdown?: boolean;
}

export const Navbar: React.FC<Props> = ({
  fileName,
  totalPages,
  pdfVersion,
  onFileUpload,
  onLoadSample,
  onSelectPdfVersion,
  onSaveWorkspace,
  onOpenWorkspace,
  viewLayout,
  onViewLayoutChange,
  themeMode = 'dark',
  onThemeModeChange,
  showPageList = true,
  onTogglePageList,
  isRightSidebarOpen = false,
  onToggleRightSidebar,
  selectionMode = 'box',
  onSelectionModeChange,
  onQuickAutoSegment,
  isQuickSegmenting = false,
  onTriggerAutoDetect,
  isDetectingObjects = false,
  selectedObjectId,
  onAutoAlignSelected,
  onToggleLockSelected,
  isSelectedLocked = false,
  onClearAllObjects,
  onClearPageObjects,
  currentPage = 1,
  onPageChange,
  zoom = 1.0,
  onZoomChange,
  onFitToWidth,
  totalObjectCount = 0,
  currentPageObjectCount = 0,
  onBatchConvertPage,
  isBatchConverting = false,
  batchProgress,
  hasUnconvertedObjects = false,
  onTriggerFullPageConvert,
  isConvertingFullPage = false,
  onInsertToc,
  canInsertToc = false,
  onCopyMarkdown,
  onDownloadMarkdown,
  copiedMarkdown = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onFileUpload(file);
    }
    e.target.value = '';
  };

  const handleWorkspaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenWorkspace(file);
    }
    e.target.value = '';
  };

  const isPdfVisible = viewLayout === 'pdf' || viewLayout === 'split';
  const isMarkdownVisible = viewLayout !== 'pdf';

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 select-none relative z-50 text-xs overflow-visible gap-2">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={workspaceInputRef}
        type="file"
        accept=".pdfmd,.json"
        onChange={handleWorkspaceFileChange}
        className="hidden"
      />

      {/* LEFT SECTION: File & Workspace Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* File actions */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer shrink-0 font-medium"
          title="上傳 PDF 檔案"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">上傳</span>
        </button>

        {/* Workspace Open & Save */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => workspaceInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer font-medium"
            title="開啟工作檔 (.pdfmd / .json)"
          >
            <FolderOpen className="w-3 h-3 text-amber-400" />
            <span className="hidden xl:inline">開啟</span>
          </button>
          <button
            type="button"
            onClick={onSaveWorkspace}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer font-medium shadow-xs"
            title="儲存工作檔 (.pdfmd)"
          >
            <Save className="w-3 h-3" />
            <span className="hidden xl:inline">儲存</span>
          </button>
        </div>

        {/* Samples */}
        <div className="hidden 2xl:flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onLoadSample('paper')}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="載入論文範例"
          >
            <BookOpen className="w-3 h-3 text-indigo-400" />
            <span>範例論文</span>
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('invoice')}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="載入報表範例"
          >
            <Receipt className="w-3 h-3 text-emerald-400" />
            <span>範例報表</span>
          </button>
        </div>
      </div>

      {/* CENTER SECTION: Unified PDF Tools & Markdown Tools (Shared Single Row) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* PDF TOOLS GROUP - Always present, grayed out when !isPdfVisible */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Selection Tool Mode Buttons */}
          <div
            className={`flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border transition ${
              isPdfVisible ? 'border-slate-800' : 'border-slate-800/50 opacity-40'
            }`}
          >
            <button
              type="button"
              disabled={!isPdfVisible}
              onClick={() => onSelectionModeChange?.('box')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition font-medium ${
                !isPdfVisible
                  ? 'text-slate-600 cursor-not-allowed'
                  : selectionMode === 'box'
                  ? 'bg-indigo-600 text-white shadow-xs cursor-pointer'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title="自由框選工具"
            >
              <Crop className="w-3 h-3" />
              <span className="hidden sm:inline">框選</span>
            </button>
            <button
              type="button"
              disabled={!isPdfVisible}
              onClick={() => onSelectionModeChange?.('text')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition font-medium ${
                !isPdfVisible
                  ? 'text-slate-600 cursor-not-allowed'
                  : selectionMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-xs cursor-pointer'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title="點選文字區塊"
            >
              <Type className="w-3 h-3" />
              <span className="hidden sm:inline">點選</span>
            </button>
            <button
              type="button"
              disabled={!isPdfVisible}
              onClick={() => onSelectionModeChange?.('pan')}
              className={`p-1 rounded transition ${
                !isPdfVisible
                  ? 'text-slate-600 cursor-not-allowed'
                  : selectionMode === 'pan'
                  ? 'bg-indigo-600 text-white shadow-xs cursor-pointer'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
              title="檢視瀏覽模式"
            >
              <MousePointer className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Content Auto Segment Button */}
          {onQuickAutoSegment && (
            <div className="relative flex items-center">
              <button
                type="button"
                disabled={!isPdfVisible || isQuickSegmenting}
                onClick={() => onQuickAutoSegment('semantic')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-l-lg font-bold transition shadow-xs ${
                  !isPdfVisible
                    ? 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-40 shadow-none'
                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 cursor-pointer disabled:opacity-50'
                }`}
                title="快速自動框選本頁內容 (語意粗分)"
              >
                {isQuickSegmenting ? (
                  <RotateCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className={`w-3 h-3 ${!isPdfVisible ? 'text-slate-500' : 'fill-slate-950'}`} />
                )}
                <span className="hidden sm:inline">自動框選</span>
              </button>
              <button
                type="button"
                disabled={!isPdfVisible}
                onClick={() => isPdfVisible && setShowAutoMenu((prev) => !prev)}
                className={`px-1 py-1 rounded-r-lg border-l transition ${
                  !isPdfVisible
                    ? 'bg-slate-800/80 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-40'
                    : 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-700/60 cursor-pointer'
                }`}
                title="選擇自動框選模式"
              >
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAutoMenu && isPdfVisible && (
                <>
                  <div className="fixed inset-0 z-50 bg-black/10" onClick={() => setShowAutoMenu(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-[60] text-xs flex flex-col gap-1 backdrop-blur-md">
                    <div className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 border-b border-slate-800">
                      自動框選模式
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onQuickAutoSegment('semantic');
                        setShowAutoMenu(false);
                      }}
                      className="p-1.5 rounded-lg hover:bg-amber-950/40 text-amber-200 text-left transition cursor-pointer"
                    >
                      <div className="font-semibold text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>依段落表格粗分 (推薦)</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onQuickAutoSegment('lines');
                        setShowAutoMenu(false);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-xs">逐行細緻框選</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onQuickAutoSegment('tables_headings');
                        setShowAutoMenu(false);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-xs">僅框選表格與標題</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Auto-detect action */}
          {onTriggerAutoDetect && (
            <button
              type="button"
              disabled={!isPdfVisible || isDetectingObjects}
              onClick={onTriggerAutoDetect}
              className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition shrink-0 ${
                !isPdfVisible
                  ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 hover:text-white cursor-pointer disabled:opacity-50'
              }`}
              title="使用 Gemini 視覺多模態模型深度識別"
            >
              {isDetectingObjects ? (
                <RotateCw className="w-3 h-3 animate-spin text-amber-400" />
              ) : (
                <Sparkles className={`w-3 h-3 ${!isPdfVisible ? 'text-slate-600' : 'text-amber-300'}`} />
              )}
              <span className="hidden sm:inline">AI 識別</span>
            </button>
          )}

          {/* Object-specific tools - Always rendered, disabled when no object selected or !isPdfVisible */}
          {onAutoAlignSelected && (
            <button
              type="button"
              disabled={!isPdfVisible || !selectedObjectId}
              onClick={onAutoAlignSelected}
              className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition shrink-0 border ${
                !isPdfVisible || !selectedObjectId
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500/60 cursor-pointer'
              }`}
              title={
                !isPdfVisible
                  ? 'PDF 工具 (在 PDF 模式啟用)'
                  : !selectedObjectId
                  ? '請先選取物件以自動對齊'
                  : '自動對齊選中物件大小 (A)'
              }
            >
              <ScanLine className="w-3 h-3" />
              <span className="hidden md:inline">對齊</span>
            </button>
          )}

          {onToggleLockSelected && (
            <button
              type="button"
              disabled={!isPdfVisible || !selectedObjectId}
              onClick={onToggleLockSelected}
              className={`p-1 rounded font-medium transition border shrink-0 ${
                !isPdfVisible || !selectedObjectId
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : isSelectedLocked
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 cursor-pointer'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              }`}
              title={
                !isPdfVisible
                  ? 'PDF 工具 (在 PDF 模式啟用)'
                  : !selectedObjectId
                  ? '請先選取物件以鎖定/解鎖'
                  : isSelectedLocked
                  ? '解除物件鎖定 (L)'
                  : '鎖定物件 (L)'
              }
            >
              {isSelectedLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          )}

          {/* Clear Objects Button */}
          {(onClearAllObjects || onClearPageObjects) && (
            <div className="relative">
              <button
                type="button"
                disabled={!isPdfVisible || (totalObjectCount === 0 && currentPageObjectCount === 0)}
                onClick={() => isPdfVisible && setShowClearConfirm((prev) => !prev)}
                className={`p-1 rounded border transition shrink-0 ${
                  !isPdfVisible || (totalObjectCount === 0 && currentPageObjectCount === 0)
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                    : 'bg-slate-800/80 hover:bg-rose-950/70 border-slate-700 text-slate-300 hover:text-rose-300 cursor-pointer'
                }`}
                title="清除已標註物件"
              >
                <Trash2 className={`w-3 h-3 ${!isPdfVisible ? 'text-slate-600' : 'text-rose-400'}`} />
              </button>
              {showClearConfirm && isPdfVisible && (
                <>
                  <div className="fixed inset-0 z-50 bg-black/10" onClick={() => setShowClearConfirm(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-[60] text-xs flex flex-col gap-1 backdrop-blur-md">
                    <div className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 border-b border-slate-800">
                      選擇清除範圍
                    </div>
                    {onClearAllObjects && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllObjects();
                          setShowClearConfirm(false);
                        }}
                        className="p-1.5 rounded hover:bg-rose-950/60 text-rose-300 text-left transition cursor-pointer flex justify-between"
                      >
                        <span>清除全部頁面物件</span>
                        <span className="font-mono text-[9px] bg-rose-900/50 px-1 rounded">{totalObjectCount}</span>
                      </button>
                    )}
                    {onClearPageObjects && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearPageObjects();
                          setShowClearConfirm(false);
                        }}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300 text-left transition cursor-pointer flex justify-between"
                      >
                        <span>僅清除本頁物件</span>
                        <span className="font-mono text-[9px] bg-slate-800 px-1 rounded">{currentPageObjectCount}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* MARKDOWN TOOLS GROUP - Always present, grayed out when !isMarkdownVisible */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* AI Batch Optimize */}
          {onBatchConvertPage && (
            <button
              type="button"
              disabled={!isMarkdownVisible || isBatchConverting || !hasUnconvertedObjects}
              onClick={onBatchConvertPage}
              className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition shrink-0 border ${
                !isMarkdownVisible || !hasUnconvertedObjects
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40 shadow-none'
                  : 'bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border-indigo-800/70 cursor-pointer disabled:opacity-50'
              }`}
              title={
                !isMarkdownVisible
                  ? 'Markdown 工具 (在 Markdown 模式啟用)'
                  : !hasUnconvertedObjects
                  ? '本頁已無待優化物件'
                  : 'AI 最佳化本頁物件'
              }
            >
              {isBatchConverting ? (
                <>
                  <RotateCw className="w-3 h-3 animate-spin text-amber-300" />
                  <span>AI 優化中 ({batchProgress?.current || 0}/{batchProgress?.total || 0})</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-3 h-3 ${!isMarkdownVisible || !hasUnconvertedObjects ? 'text-slate-600' : 'text-amber-300'}`} />
                  <span className="hidden sm:inline">AI 最佳化</span>
                </>
              )}
            </button>
          )}

          {/* Full page convert */}
          {onTriggerFullPageConvert && (
            <button
              type="button"
              disabled={!isMarkdownVisible || isConvertingFullPage}
              onClick={onTriggerFullPageConvert}
              className={`flex items-center gap-1 px-2 py-1 rounded border transition shrink-0 ${
                !isMarkdownVisible
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 cursor-pointer disabled:opacity-50'
              }`}
              title={
                !isMarkdownVisible
                  ? 'Markdown 工具 (在 Markdown 模式啟用)'
                  : '全頁一鍵轉換'
              }
            >
              {isConvertingFullPage ? (
                <RotateCw className="w-3 h-3 animate-spin" />
              ) : (
                <Layers className={`w-3 h-3 ${!isMarkdownVisible ? 'text-slate-600' : 'text-sky-400'}`} />
              )}
              <span className="hidden md:inline">全頁轉換</span>
            </button>
          )}

          {/* Insert TOC */}
          {onInsertToc && (
            <button
              type="button"
              disabled={!isMarkdownVisible || !canInsertToc}
              onClick={onInsertToc}
              className={`flex items-center gap-1 px-2 py-1 rounded border transition shrink-0 ${
                !isMarkdownVisible || !canInsertToc
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              }`}
              title={
                !isMarkdownVisible
                  ? 'Markdown 工具 (在 Markdown 模式啟用)'
                  : !canInsertToc
                  ? '目前文件無 PDF 大綱可插入'
                  : '插入 PDF 大綱目錄至開頭'
              }
            >
              <ListTree className={`w-3 h-3 ${!isMarkdownVisible || !canInsertToc ? 'text-slate-600' : 'text-indigo-400'}`} />
              <span className="hidden lg:inline">插入大綱</span>
            </button>
          )}

          {/* Copy MD */}
          {onCopyMarkdown && (
            <button
              type="button"
              disabled={!isMarkdownVisible}
              onClick={onCopyMarkdown}
              className={`flex items-center gap-1 px-2 py-1 rounded border transition shrink-0 ${
                !isMarkdownVisible
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              }`}
              title={
                !isMarkdownVisible
                  ? 'Markdown 工具 (在 Markdown 模式啟用)'
                  : '複製 Markdown 到剪貼簿'
              }
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">已複製</span>
                </>
              ) : (
                <>
                  <Copy className={`w-3 h-3 ${!isMarkdownVisible ? 'text-slate-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">複製 MD</span>
                </>
              )}
            </button>
          )}

          {/* Download MD */}
          {onDownloadMarkdown && (
            <button
              type="button"
              disabled={!isMarkdownVisible}
              onClick={onDownloadMarkdown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium border transition shrink-0 ${
                !isMarkdownVisible
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40 shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-xs cursor-pointer'
              }`}
              title={
                !isMarkdownVisible
                  ? 'Markdown 工具 (在 Markdown 模式啟用)'
                  : '下載為 .md 檔案'
              }
            >
              <Download className="w-3 h-3" />
              <span>下載 .md</span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
};
