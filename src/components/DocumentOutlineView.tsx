import React, { useState, useEffect, useMemo } from 'react';
import {
  PdfOutlineItem,
  extractPdfDocumentOutline,
  flattenPdfOutline,
  countPdfOutlineNodes,
  generateMarkdownTocFromPdfOutline,
} from '../utils/documentOutline';
import {
  ListTree,
  Bookmark,
  Search,
  Copy,
  Check,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  AlignLeft,
  X,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface Props {
  pdfDoc: any;
  totalPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onInsertToc?: (tocMarkdown: string) => void;
  onClose?: () => void;
  variant?: 'sidebar' | 'workspace';
}

export const DocumentOutlineView: React.FC<Props> = ({
  pdfDoc,
  totalPages,
  currentPage,
  onPageChange,
  onInsertToc,
  onClose,
  variant = 'sidebar',
}) => {
  const [outlineItems, setOutlineItems] = useState<PdfOutlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToc, setCopiedToc] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Load PDF Outline directly from the PDF document
  useEffect(() => {
    if (!pdfDoc) {
      setOutlineItems([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    extractPdfDocumentOutline(pdfDoc)
      .then((items) => {
        if (isMounted) {
          setOutlineItems(items);
        }
      })
      .catch((err) => {
        console.warn('Failed to load PDF outline:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc]);

  // Flattened items for search and stats
  const flatItems = useMemo(() => {
    return flattenPdfOutline(outlineItems);
  }, [outlineItems]);

  const stats = useMemo(() => {
    return countPdfOutlineNodes(outlineItems);
  }, [outlineItems]);

  // Is source native PDF bookmarks or scanned from PDF pages?
  const hasNativeBookmarks = useMemo(() => {
    return flatItems.some((item) => item.source === 'native_pdf_bookmark');
  }, [flatItems]);

  // Search filtered items
  const filteredFlatItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return flatItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        `第 ${item.pageNumber} 頁`.includes(q) ||
        `p.${item.pageNumber}`.includes(q)
      );
    });
  }, [flatItems, searchQuery]);

  const handleCopyToc = () => {
    const tocMd = generateMarkdownTocFromPdfOutline(outlineItems);
    navigator.clipboard.writeText(tocMd);
    setCopiedToc(true);
    setTimeout(() => setCopiedToc(false), 2000);
  };

  const handleInsertTocClick = () => {
    if (!onInsertToc) return;
    const tocMd = generateMarkdownTocFromPdfOutline(outlineItems);
    onInsertToc(tocMd);
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render individual tree item (supporting nested sub-chapters)
  const renderOutlineNode = (node: PdfOutlineItem, depth: number = 0) => {
    const isCurrentPage = node.pageNumber === currentPage;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = !!collapsedNodes[node.id];

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => onPageChange(node.pageNumber)}
          style={{ paddingLeft: `${Math.min(36, depth * 14) + 8}px` }}
          className={`group relative flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
            isCurrentPage
              ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/50 text-indigo-950 dark:text-white font-medium shadow-sm'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-300'
          }`}
        >
          {/* Active page indicator strip */}
          <div
            className={`absolute left-1 top-2 bottom-2 w-1 rounded-full ${
              isCurrentPage ? 'bg-indigo-500' : 'bg-transparent'
            }`}
          />

          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {/* Collapse / Expand toggle button for tree parent */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 dark:hover:text-white cursor-pointer shrink-0"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0 mx-0.5" />
            )}

            {/* Title */}
            <span
              className={`truncate text-xs ${
                isCurrentPage
                  ? 'font-bold text-indigo-700 dark:text-indigo-200'
                  : node.level === 1
                  ? 'font-bold text-slate-800 dark:text-slate-100'
                  : node.level === 2
                  ? 'font-medium text-slate-700 dark:text-slate-200'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
              title={node.title}
            >
              {node.title}
            </span>
          </div>

          {/* Page Badge & Navigation arrow */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                isCurrentPage
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 font-bold'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 group-hover:text-slate-900 dark:group-hover:text-slate-300'
              }`}
            >
              第 {node.pageNumber} 頁
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Child sub-chapters */}
        {hasChildren && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {node.children!.map((child) => renderOutlineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 select-none ${
        variant === 'sidebar'
          ? 'w-full text-xs'
          : 'p-6 max-w-4xl mx-auto w-full text-sm'
      }`}
    >
      {/* Header bar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <span>PDF 文件大綱 (Outline)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {stats.total} 個章節
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy TOC */}
          <button
            type="button"
            onClick={handleCopyToc}
            disabled={stats.total === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer text-[11px]"
            title="複製 PDF 大綱為 Markdown 目錄語法 (TOC)"
          >
            {copiedToc ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>複製大綱</span>
              </>
            )}
          </button>

          {/* Insert TOC into document */}
          {onInsertToc && (
            <button
              type="button"
              onClick={handleInsertTocClick}
              disabled={stats.total === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-40 cursor-pointer text-[11px] shadow-xs"
              title="將此 PDF 大綱目錄插入至 Markdown 文件頂端"
            >
              <PlusCircle className="w-3 h-3" />
              <span>插入 TOC</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition ml-1"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Outline Type Indicator Bar */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Bookmark className="w-3 h-3 text-indigo-400" />
          <span>大綱來源：</span>
          <span
            className={`font-medium px-1.5 py-0.2 rounded border font-mono ${
              hasNativeBookmarks
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
            }`}
          >
            {hasNativeBookmarks ? 'PDF 原生書籤 (/Outlines)' : 'PDF 智慧章節萃取'}
          </span>
        </div>

        <span className="text-slate-500 font-mono text-[10px]">
          共 {totalPages} 頁
        </span>
      </div>

      {/* Search Input Bar */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/20">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="搜尋 PDF 章節名稱或頁碼..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* PDF Outline tree list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>讀取 PDF 大綱目錄中...</span>
          </div>
        ) : filteredFlatItems !== null ? (
          // Search results flat view
          filteredFlatItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              無符合「{searchQuery}」的 PDF 章節
            </div>
          ) : (
            filteredFlatItems.map((node) => renderOutlineNode(node, 0))
          )
        ) : outlineItems.length === 0 ? (
          // Empty State
          <div className="py-12 px-4 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <BookOpen className="w-8 h-8 opacity-40 text-slate-400" />
            <span className="font-semibold text-slate-400">此 PDF 未包含目錄大綱</span>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              目前載入的 PDF 檔案中未發現書籤目錄 (/Outlines)。您可開啟具有內建目錄的書籍或論文 PDF，系統將即時載入完整章節結構。
            </p>
          </div>
        ) : (
          // Tree View
          outlineItems.map((item) => renderOutlineNode(item, 0))
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
          <span>點選任一章節可立即跳轉至 PDF 該頁</span>
        </span>
        <button
          type="button"
          onClick={handleCopyToc}
          disabled={stats.total === 0}
          className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer disabled:opacity-40"
        >
          複製大綱 TOC
        </button>
      </div>
    </div>
  );
};
