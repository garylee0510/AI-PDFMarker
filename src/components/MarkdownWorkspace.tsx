import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PDFObjectItem, ConversionType, ViewLayout } from '../types';
import { formatInstantMarkdown, renderMarkdownHtml } from '../utils/markdownFormatter';
import {
  extractPdfDocumentOutline,
  generateMarkdownTocFromPdfOutline,
} from '../utils/documentOutline';
import { CONVERSION_TYPE_CONFIGS, ConversionTypeBadge } from './ConversionTypeBadge';
import { DocumentOutlineView } from './DocumentOutlineView';
import {
  FileText,
  Code2,
  ListOrdered,
  Copy,
  Check,
  Download,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCw,
  RotateCcw,
  Columns,
  Eye,
  CheckCircle2,
  Layers,
  MousePointerClick,
  ListTree,
} from 'lucide-react';

interface Props {
  pdfDoc?: any;
  objects: PDFObjectItem[];
  allPagesObjects: Record<number, PDFObjectItem[]>;
  currentPage: number;
  totalPages: number;
  selectedObjectId?: string | null;
  onSelectObject: (id: string) => void;
  onPageChange?: (page: number) => void;
  onDeleteObject: (id: string) => void;
  onMoveObject: (id: string, direction: 'up' | 'down') => void;
  onBatchConvertPage: () => Promise<void>;
  onBatchConvertAll: () => Promise<void>;
  isBatchConverting: boolean;
  batchProgress?: { current: number; total: number };
  fullPageMarkdown?: string;
  onFullPageMarkdownChange?: (text: string) => void;
  onTriggerFullPageConvert: () => Promise<void>;
  isConvertingFullPage: boolean;
  onClearAllObjects?: () => void;
  activeTab?: 'preview' | 'split' | 'raw' | 'outline';
  onActiveTabChange?: (tab: 'preview' | 'split' | 'raw' | 'outline') => void;
  viewLayout?: ViewLayout;
  onRegisterMarkdownActions?: (actions: MarkdownWorkspaceActions | null) => void;
  onCanInsertTocChange?: (can: boolean) => void;
}

export interface MarkdownWorkspaceActions {
  copy: () => void;
  download: () => void;
  insertToc: () => void;
  canInsertToc: boolean;
}

interface MarkdownSourceEditorProps {
  value: string;
  onChange: (val: string) => void;
  isCustomOverride: boolean;
  onResetOverride: () => void;
  title?: string;
  className?: string;
}

export const MarkdownSourceEditor: React.FC<MarkdownSourceEditorProps> = ({
  value,
  onChange,
  isCustomOverride,
  onResetOverride,
  title = 'Markdown 原始碼',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = useMemo(() => (value ? value.split('\n').length : 0), [value]);
  const charCount = useMemo(() => value.length, [value]);

  return (
    <div className={`flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl ${className}`}>
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-300 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">{title}</span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            {lineCount} 行 · {charCount} 字
          </span>
          {isCustomOverride && (
            <span className="text-[10px] text-amber-400 bg-amber-950/70 border border-amber-800/70 px-1.5 py-0.5 rounded font-medium">
              已手動編輯
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isCustomOverride && (
            <button
              type="button"
              onClick={onResetOverride}
              className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 px-2 py-0.5 rounded transition cursor-pointer"
              title="捨棄手動編輯，還原為物件自動組合內容"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>還原組合內容</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded transition cursor-pointer"
            title="複製 Markdown 原始碼"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>複製</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full flex-1 font-mono text-xs leading-relaxed p-4 bg-slate-950 text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 resize-none selection:bg-indigo-900/60 selection:text-indigo-200 placeholder:text-slate-600 border-none"
        placeholder="在此檢視或直接編輯 Markdown 原始碼..."
        spellCheck={false}
      />
    </div>
  );
};

export const MarkdownWorkspace: React.FC<Props> = ({
  pdfDoc,
  objects,
  allPagesObjects,
  currentPage,
  totalPages,
  selectedObjectId,
  onSelectObject,
  onPageChange,
  onDeleteObject,
  onMoveObject,
  onBatchConvertPage,
  onBatchConvertAll,
  isBatchConverting,
  batchProgress,
  fullPageMarkdown,
  onFullPageMarkdownChange,
  onTriggerFullPageConvert,
  isConvertingFullPage,
  onClearAllObjects,
  activeTab: propActiveTab,
  onActiveTabChange,
  viewLayout,
  onRegisterMarkdownActions,
  onCanInsertTocChange,
}) => {
  const [internalTab, setInternalTab] = useState<'preview' | 'split' | 'raw' | 'outline'>('preview');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;

  const setActiveTab = (newTab: 'preview' | 'split' | 'raw' | 'outline') => {
    setInternalTab(newTab);
    onActiveTabChange?.(newTab);
  };

  const [copied, setCopied] = useState(false);
  const [customMarkdownOverride, setCustomMarkdownOverride] = useState<string | null>(null);

  // When objects change or move, ensure live layout is shown (safeguarded against unnecessary resets)
  useEffect(() => {
    if (customMarkdownOverride !== null) {
      setCustomMarkdownOverride(null);
    }
  }, [allPagesObjects, customMarkdownOverride]);

  // Combine markdown results from all objects across all pages in natural page and sequence order.
  // CRITICAL: Truly generates real Markdown for each object immediately based on its specified conversionType!
  const combinedMarkdown = useMemo(() => {
    if (customMarkdownOverride !== null) {
      return customMarkdownOverride;
    }

    if (fullPageMarkdown && objects.length === 0) {
      return fullPageMarkdown;
    }

    const segments: string[] = [];

    // Sort page numbers
    const pageKeys = Object.keys(allPagesObjects)
      .map(Number)
      .sort((a, b) => a - b);

    if (pageKeys.length === 0 && fullPageMarkdown) {
      return fullPageMarkdown;
    }

    pageKeys.forEach((pageNum) => {
      const pageObjs = allPagesObjects[pageNum] || [];
      if (pageObjs.length > 0 && pageKeys.length > 1) {
        segments.push(`\n---\n*頁面 ${pageNum}*\n`);
      }

      pageObjs.forEach((obj) => {
        if (obj.conversionType === 'ignore') return;

        // Use AI converted result, or instant live formatted Markdown based on chosen type!
        const md =
          obj.markdownResult && obj.markdownResult.trim()
            ? obj.markdownResult.trim()
            : formatInstantMarkdown(obj.rawText, obj.conversionType, obj.cropImageDataUrl);

        if (md && md.trim()) {
          segments.push(md.trim());
        }
      });
    });

    if (segments.length === 0) {
      return `# 示範文件\n\n歡迎使用 **PDF 轉 Markdown 智慧物件轉換器**。\n\n在左側 PDF 預覽中：\n1. 使用 **框選物件** 拖曳任意標題、表格、公式或程式碼\n2. 點選 **指定轉換方式**（例如表格、LaTeX 公式、H1 標題）\n3. 即時排版將在右側立即**真實現身**為對應的 Markdown 排版成果！`;
    }

    return segments.join('\n\n');
  }, [allPagesObjects, customMarkdownOverride, fullPageMarkdown, objects.length]);

  // Load PDF Document Outline items directly from pdfDoc
  const [pdfOutlineItems, setPdfOutlineItems] = useState<any[]>([]);

  useEffect(() => {
    if (!pdfDoc) {
      setPdfOutlineItems([]);
      onCanInsertTocChange?.(false);
      return;
    }
    extractPdfDocumentOutline(pdfDoc)
      .then((items) => {
        setPdfOutlineItems(items);
        onCanInsertTocChange?.(items.length > 0);
      })
      .catch(() => {
        onCanInsertTocChange?.(false);
      });
  }, [pdfDoc, onCanInsertTocChange]);

  // Structured list of rendered items for interactive preview selection
  interface RenderedPreviewItem {
    id: string;
    pageNumber: number;
    conversionType: ConversionType;
    customColor?: string;
    html: string;
    rawText?: string;
  }

  const renderedPreviewItems = useMemo<RenderedPreviewItem[]>(() => {
    // If user edited raw Markdown manually or empty, fall back to null
    if (customMarkdownOverride !== null) {
      return [];
    }

    const items: RenderedPreviewItem[] = [];
    const pageKeys = Object.keys(allPagesObjects)
      .map(Number)
      .sort((a, b) => a - b);

    pageKeys.forEach((pageNum) => {
      const pageObjs = allPagesObjects[pageNum] || [];
      pageObjs.forEach((obj) => {
        if (obj.conversionType === 'ignore') return;
        const md =
          obj.markdownResult && obj.markdownResult.trim()
            ? obj.markdownResult.trim()
            : formatInstantMarkdown(obj.rawText, obj.conversionType, obj.cropImageDataUrl);

        if (md && md.trim()) {
          const html = renderMarkdownHtml(md.trim());
          items.push({
            id: obj.id,
            pageNumber: pageNum,
            conversionType: obj.conversionType,
            customColor: obj.customColor,
            html,
            rawText: obj.rawText,
          });
        }
      });
    });

    return items;
  }, [allPagesObjects, customMarkdownOverride]);

  // Fallback single rendered HTML string (for split view or custom override)
  const renderedHtml = useMemo(() => {
    return renderMarkdownHtml(combinedMarkdown);
  }, [combinedMarkdown]);

  // Find currently selected preview item (if any)
  const selectedItem = useMemo(() => {
    if (!selectedObjectId) return null;
    return renderedPreviewItems.find((item) => item.id === selectedObjectId) || null;
  }, [selectedObjectId, renderedPreviewItems]);

  // Statistics
  const stats = useMemo(() => {
    const text = combinedMarkdown.replace(/<!--[\s\S]*?-->/g, '');
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    let totalObjs = 0;
    let convertedObjs = 0;
    Object.values(allPagesObjects).forEach((list) => {
      totalObjs += list.length;
      convertedObjs += list.filter((o) => !!o.markdownResult).length;
    });

    return { charCount, wordCount, totalObjs, convertedObjs };
  }, [combinedMarkdown, allPagesObjects]);

  const handleCopy = () => {
    navigator.clipboard.writeText(combinedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([combinedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-document-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Register Markdown actions to parent with ref forwarding to prevent re-render loops
  const markdownActionsRef = useRef<MarkdownWorkspaceActions>({
    copy: handleCopy,
    download: handleDownload,
    insertToc: () => {},
    canInsertToc: pdfOutlineItems.length > 0,
  });
  markdownActionsRef.current = {
    copy: handleCopy,
    download: handleDownload,
    insertToc: () => {
      if (pdfOutlineItems.length > 0) {
        const tocMd = generateMarkdownTocFromPdfOutline(pdfOutlineItems);
        if (customMarkdownOverride !== null) {
          setCustomMarkdownOverride(tocMd + '\n\n---\n\n' + customMarkdownOverride);
        } else {
          setCustomMarkdownOverride(tocMd + '\n\n---\n\n' + combinedMarkdown);
        }
      }
    },
    canInsertToc: pdfOutlineItems.length > 0,
  };

  useEffect(() => {
    if (onRegisterMarkdownActions) {
      onRegisterMarkdownActions({
        copy: () => markdownActionsRef.current.copy(),
        download: () => markdownActionsRef.current.download(),
        insertToc: () => markdownActionsRef.current.insertToc(),
        canInsertToc: pdfOutlineItems.length > 0,
      });
      return () => {
        onRegisterMarkdownActions(null);
      };
    }
  }, [onRegisterMarkdownActions]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
        {/* TAB 1: Real Rendered Markdown Preview (LaTeX, Tables, Code, Quotes) */}
        {activeTab === 'preview' && (
          <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-slate-800 text-xs text-slate-400 gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>真實 Markdown 排版成果（含 KaTeX 數學式、GFM 表格與程式碼區塊）</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedItem && (
                  <button
                    type="button"
                    onClick={() => onDeleteObject(selectedItem.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-950/90 hover:bg-rose-200 dark:hover:bg-rose-900 active:bg-rose-300 dark:active:bg-rose-950 border border-rose-300 dark:border-rose-600/70 transition cursor-pointer shadow-xs"
                    title={`刪除第 ${selectedItem.pageNumber} 頁選中的物件`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>刪除選中物件 (第 {selectedItem.pageNumber} 頁)</span>
                  </button>
                )}
                {renderedPreviewItems.length > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800/60 px-2 py-0.5 rounded-full">
                    <MousePointerClick className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>點選區塊可直接選取物件</span>
                  </span>
                )}
                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-transparent px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">
                  即時同步
                </span>
              </div>
            </div>

            {renderedPreviewItems.length > 0 ? (
              <div className="space-y-4">
                {renderedPreviewItems.map((item) => {
                  const isSelected = selectedObjectId === item.id;
                  const typeConfig = CONVERSION_TYPE_CONFIGS[item.conversionType as keyof typeof CONVERSION_TYPE_CONFIGS];
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.pageNumber !== currentPage && onPageChange) {
                          onPageChange(item.pageNumber);
                        }
                        onSelectObject(item.id);
                      }}
                      className={`group relative rounded-xl p-3 sm:p-4 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-400 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                          : 'border border-transparent hover:border-slate-300 dark:hover:border-slate-700/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:ring-1 hover:ring-indigo-500/40'
                      }`}
                      title={`點擊選取第 ${item.pageNumber} 頁物件 (${typeConfig?.label || item.conversionType})`}
                    >
                      {/* Interactive indicator bar on hover or selected */}
                      <div
                        className={`flex items-center justify-between text-xs mb-2 transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            第 {item.pageNumber} 頁
                          </span>
                          {typeConfig && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeConfig.bgColor} ${typeConfig.color} border ${typeConfig.borderColor}`}>
                              {typeConfig.shortLabel || typeConfig.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteObject(item.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-950/90 hover:bg-rose-200 dark:hover:bg-rose-900 active:bg-rose-300 dark:active:bg-rose-950 hover:text-rose-800 dark:hover:text-white border border-rose-300 dark:border-rose-600/80 shadow-xs transition cursor-pointer"
                              title="刪除此物件"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>刪除此物件</span>
                            </button>
                          )}
                          <span
                            className={`flex items-center gap-1 text-[11px] font-medium ${
                              isSelected ? 'text-indigo-600 dark:text-indigo-300 font-semibold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <MousePointerClick className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            {isSelected ? '✓ 已選取' : '點擊以選取'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="markdown-body select-text"
                        dangerouslySetInnerHTML={{ __html: item.html }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            )}
          </div>
        )}

        {/* TAB 2: Split View (Mode 4: 雙欄分割檢視 (Markdown + Markdown 原始碼)) */}
        {activeTab === 'split' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Rendered Markdown Preview (Markdown 排版預覽) */}
            <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-300 shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">Markdown 排版預覽</span>
                </div>
                {renderedPreviewItems.length > 0 && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                    點擊物件可選取
                  </span>
                )}
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {renderedPreviewItems.length > 0 ? (
                  <div className="space-y-3">
                    {renderedPreviewItems.map((item) => {
                      const isSelected = selectedObjectId === item.id;
                      const typeConfig = CONVERSION_TYPE_CONFIGS[item.conversionType as keyof typeof CONVERSION_TYPE_CONFIGS];
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.pageNumber !== currentPage && onPageChange) {
                              onPageChange(item.pageNumber);
                            }
                            onSelectObject(item.id);
                          }}
                          className={`group relative rounded-lg p-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-400 dark:border-indigo-500/40'
                              : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:ring-1 hover:ring-indigo-500/30'
                          }`}
                          title="點擊選取物件"
                        >
                          <div
                            className={`flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800/60 ${
                              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="px-1 py-0.2 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                P.{item.pageNumber}
                              </span>
                              <ConversionTypeBadge
                                type={item.conversionType}
                                short
                                customColor={item.customColor}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteObject(item.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-950/90 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700/60 transition cursor-pointer"
                                  title="刪除此物件"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  <span>刪除</span>
                                </button>
                              )}
                              <span className={`text-[10px] ${isSelected ? 'text-indigo-600 dark:text-indigo-300 font-medium' : 'text-slate-500'}`}>
                                {isSelected ? '已選取' : '點擊選取'}
                              </span>
                            </div>
                          </div>

                          <div
                            className="markdown-body"
                            dangerouslySetInnerHTML={{ __html: item.html }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="markdown-body select-text"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                )}
              </div>
            </div>

            {/* Right: Markdown 原始碼 (使用與 Mode 5 完全相同的 MarkdownSourceEditor) */}
            <MarkdownSourceEditor
              value={combinedMarkdown}
              onChange={(val) => setCustomMarkdownOverride(val)}
              isCustomOverride={customMarkdownOverride !== null}
              onResetOverride={() => setCustomMarkdownOverride(null)}
              title="Markdown 原始碼"
            />
          </div>
        )}

        {/* TAB 3: Raw Markdown Source Editor (Mode 5: 專注 Markdown 原始碼，使用同一個組件) */}
        {activeTab === 'raw' && (
          <div className="h-full flex flex-col">
            <MarkdownSourceEditor
              value={combinedMarkdown}
              onChange={(val) => setCustomMarkdownOverride(val)}
              isCustomOverride={customMarkdownOverride !== null}
              onResetOverride={() => setCustomMarkdownOverride(null)}
              title="專注 Markdown 原始碼"
              className="h-full"
            />
          </div>
        )}

        {/* TAB 4: PDF Document Outline (PDF 大綱) */}
        {activeTab === 'outline' && (
          <div className="h-full flex flex-col overflow-hidden">
            <DocumentOutlineView
              pdfDoc={pdfDoc}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={(pg) => {
                onPageChange?.(pg);
              }}
              onInsertToc={(tocMd) => {
                if (customMarkdownOverride !== null) {
                  setCustomMarkdownOverride(tocMd + '\n\n---\n\n' + customMarkdownOverride);
                } else {
                  setCustomMarkdownOverride(tocMd + '\n\n---\n\n' + combinedMarkdown);
                }
                setActiveTab('preview');
              }}
              variant="workspace"
            />
          </div>
        )}
      </div>
    </div>
  );
};
