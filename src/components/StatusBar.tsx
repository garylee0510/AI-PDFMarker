import React, { useState } from 'react';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Layers,
  Sparkles,
  MousePointer,
  Crop,
  Eye,
  CheckCircle2,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { ViewLayout, ThemeMode } from '../types';
import { SUPPORTED_PDF_VERSIONS } from '../utils/samplePdf';

interface StatusBarProps {
  // Document Information
  fileName: string;
  pdfVersion?: string;
  onSelectPdfVersion?: (version: string) => void;
  currentPage: number;
  totalPages: number;
  totalObjectCount: number;
  currentPageObjectCount: number;
  convertedObjectsCount?: number;
  markdownCharCount?: number;

  // View Layout
  viewLayout: ViewLayout;
  isPdfVisible: boolean;

  // Real-time statuses
  isDetectingObjects?: boolean;
  isBatchConverting?: boolean;
  isConvertingFullPage?: boolean;
  selectedObjectId?: string | null;
  selectionMode?: string;

  // Bottom-Right Corner: Page Navigation, Zoom, Fit to Width
  onPageChange?: (page: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onFitToWidth?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  fileName,
  pdfVersion = 'PDF 1.4',
  onSelectPdfVersion,
  currentPage,
  totalPages,
  totalObjectCount,
  currentPageObjectCount,
  convertedObjectsCount,
  markdownCharCount,
  viewLayout,
  isPdfVisible,
  isDetectingObjects,
  isBatchConverting,
  isConvertingFullPage,
  selectedObjectId,
  selectionMode,
  onPageChange,
  zoom = 1.0,
  onZoomChange,
  onFitToWidth,
}) => {
  // Quick jump page input state
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInputVal, setPageInputVal] = useState(String(currentPage));
  const [showVersionMenu, setShowVersionMenu] = useState(false);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputVal, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages && onPageChange) {
      onPageChange(p);
    } else {
      setPageInputVal(String(currentPage));
    }
    setIsEditingPage(false);
  };

  // Human-readable layout mode name
  const getLayoutModeLabel = () => {
    switch (viewLayout) {
      case 'pdf':
        return '1. 專注 PDF 預覽與選取';
      case 'split':
        return '2. 雙欄分割檢視 (PDF + Markdown)';
      case 'markdown_preview':
        return '3. 專注 Markdown 產出與排版';
      case 'markdown_split':
        return '4. 雙欄分割檢視 (Markdown + Markdown 原始碼)';
      case 'markdown_raw':
        return '5. 專注 Markdown 原始碼';
      default:
        return '就緒';
    }
  };

  const isWorking = isDetectingObjects || isBatchConverting || isConvertingFullPage;

  return (
    <footer className="h-7.5 bg-slate-900/95 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0 select-none z-30">
      {/* LEFT: Document Status & System State */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* System Activity / Readiness */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isWorking ? (
            <span className="flex items-center gap-1 text-indigo-400 font-medium">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              <span>
                {isDetectingObjects
                  ? 'AI 物件偵測中...'
                  : isBatchConverting
                  ? 'AI 批量最佳化中...'
                  : '全頁轉換中...'}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="text-slate-300 font-medium">就緒</span>
            </span>
          )}
        </div>

        <span className="text-slate-700 shrink-0">|</span>

        {/* File Name & PDF Version Selector */}
        <div className="flex items-center gap-1.5 min-w-0 shrink relative">
          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate max-w-[160px] text-slate-300 font-medium" title={fileName}>
            {fileName || '未載入文件'}
          </span>

          {/* Interactive PDF Version Tag / Dropup */}
          <div className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => setShowVersionMenu((prev) => !prev)}
              className="font-mono text-[10px] bg-slate-800 hover:bg-slate-700/80 text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-600 shrink-0 flex items-center gap-1 transition cursor-pointer"
              title={`PDF 規格版本：${pdfVersion || 'PDF 1.4'} (點擊切換)`}
            >
              <span>{pdfVersion || 'PDF 1.4'}</span>
              <ChevronUp className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showVersionMenu && (
              <>
                <div className="fixed inset-0 z-50 bg-black/10" onClick={() => setShowVersionMenu(false)} />
                <div className="absolute left-0 bottom-full mb-1.5 w-76 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-[60] text-xs flex flex-col gap-1.5 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="text-slate-200 font-semibold text-xs">PDF 規格版本</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60 font-bold">
                      {pdfVersion || 'PDF 1.4'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-0.5 mt-1">
                    {SUPPORTED_PDF_VERSIONS.map((item) => {
                      const isCurrent = (pdfVersion || 'PDF 1.4').includes(item.version);
                      return (
                        <button
                          key={item.version}
                          type="button"
                          onClick={() => {
                            onSelectPdfVersion?.(item.version);
                            setShowVersionMenu(false);
                          }}
                          className={`flex flex-col items-start p-1.5 rounded-lg border transition text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
                              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold font-mono text-xs text-slate-200">{item.label}</span>
                            {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">{item.features}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <span className="text-slate-700 shrink-0 hidden sm:inline">|</span>

        {/* Object statistics */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 shrink-0">
          <Layers className="w-3 h-3 text-slate-500 shrink-0" />
          <span>
            本頁 <strong className="text-slate-200 font-medium">{currentPageObjectCount}</strong> 個物件
          </span>
          <span className="text-slate-600">/</span>
          <span>
            全文 <strong className="text-slate-200 font-medium">{totalObjectCount}</strong> 個
          </span>
          {convertedObjectsCount !== undefined && convertedObjectsCount > 0 && (
            <span className="text-slate-500 font-mono text-[10px]">
              ({convertedObjectsCount} 已深度優化)
            </span>
          )}
        </div>

        {/* Markdown character count if available */}
        {markdownCharCount !== undefined && markdownCharCount > 0 && (
          <>
            <span className="text-slate-700 shrink-0 hidden md:inline">|</span>
            <div className="hidden md:flex items-center gap-1 text-slate-400 shrink-0">
              <span>字數:</span>
              <strong className="text-slate-200 font-mono font-medium">{markdownCharCount}</strong>
            </div>
          </>
        )}
      </div>

      {/* MIDDLE: Active Mode Badge & Selection Info */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          {getLayoutModeLabel()}
        </span>

        {selectedObjectId ? (
          <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
            已選取物件
          </span>
        ) : isPdfVisible && selectionMode ? (
          <span className="text-slate-500 text-[10px] flex items-center gap-1">
            {selectionMode === 'box' && <Crop className="w-2.5 h-2.5 text-slate-500" />}
            {selectionMode === 'select' && <MousePointer className="w-2.5 h-2.5 text-slate-500" />}
            {selectionMode === 'view' && <Eye className="w-2.5 h-2.5 text-slate-500" />}
            {selectionMode === 'box' ? '框選模式' : selectionMode === 'select' ? '點選模式' : '檢視模式'}
          </span>
        ) : null}
      </div>

      {/* RIGHT: Page Navigation, Zoom, Fit to Width (Requested Controls) */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {/* Page Navigation */}
        <div
          className={`flex items-center gap-0.5 bg-slate-950 px-1 py-0.5 rounded border transition ${
            isPdfVisible ? 'border-slate-800 shadow-xs' : 'border-slate-800/50 opacity-40'
          }`}
          title={isPdfVisible ? '頁面切換' : '頁面切換 (在 PDF 模式啟用)'}
        >
          <button
            type="button"
            disabled={!isPdfVisible || currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className={`p-0.5 rounded transition ${
              !isPdfVisible || currentPage <= 1
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
            }`}
            title="上一頁"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {isEditingPage && isPdfVisible ? (
            <form onSubmit={handlePageInputSubmit} className="inline-flex">
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                onBlur={handlePageInputSubmit}
                autoFocus
                className="w-8 text-center font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-indigo-500 outline-none px-0.5 py-0"
              />
            </form>
          ) : (
            <button
              type="button"
              disabled={!isPdfVisible}
              onClick={() => {
                if (isPdfVisible) {
                  setPageInputVal(String(currentPage));
                  setIsEditingPage(true);
                }
              }}
              className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                !isPdfVisible
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer'
              }`}
              title="點擊直接輸入頁碼"
            >
              <span>第 {currentPage}</span>
              <span className="text-slate-500"> / {totalPages || 1} 頁</span>
            </button>
          )}

          <button
            type="button"
            disabled={!isPdfVisible || currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className={`p-0.5 rounded transition ${
              !isPdfVisible || currentPage >= totalPages
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
            }`}
            title="下一頁"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          className={`flex items-center gap-0.5 bg-slate-950 px-1 py-0.5 rounded border transition ${
            isPdfVisible ? 'border-slate-800 shadow-xs' : 'border-slate-800/50 opacity-40'
          }`}
          title={isPdfVisible ? '畫布縮放' : '畫布縮放 (在 PDF 模式啟用)'}
        >
          <button
            type="button"
            disabled={!isPdfVisible}
            onClick={() => onZoomChange?.(Math.max(0.5, Math.round((zoom - 0.2) * 10) / 10))}
            className={`p-0.5 rounded transition ${
              !isPdfVisible
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
            }`}
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!isPdfVisible}
            onClick={() => onZoomChange?.(1.0)}
            className={`font-mono text-[11px] px-1 py-0.5 rounded min-w-[42px] text-center ${
              !isPdfVisible
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 cursor-pointer'
            }`}
            title="點擊重設為 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            disabled={!isPdfVisible}
            onClick={() => onZoomChange?.(Math.min(3.0, Math.round((zoom + 0.2) * 10) / 10))}
            className={`p-0.5 rounded transition ${
              !isPdfVisible
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
            }`}
            title="放大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Fit to width button */}
          {onFitToWidth && (
            <button
              type="button"
              disabled={!isPdfVisible}
              onClick={onFitToWidth}
              className={`p-0.5 rounded border-l border-slate-800 ml-0.5 pl-1 transition ${
                !isPdfVisible
                  ? 'text-slate-600 border-slate-800/50 cursor-not-allowed'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800 cursor-pointer'
              }`}
              title="符合寬度"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
