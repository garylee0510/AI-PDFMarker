import React, { useEffect, useState, useRef } from 'react';
import { PDFObjectItem } from '../types';
import { renderPageThumbnail } from '../utils/pdfRenderer';
import { CONVERSION_TYPE_CONFIGS, getObjectTheme } from './ConversionTypeBadge';
import { DocumentOutlineView } from './DocumentOutlineView';
import {
  FileText,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  X,
  Search,
  ArrowRight, 
  Filter,
  ListTree,
  PanelLeftClose,
} from 'lucide-react';

export type SidebarTab = 'pages' | 'outline';

interface Props {
  pdfDoc: any;
  totalPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  allPagesObjects?: Record<number, PDFObjectItem[]>;
  selectedObjectId?: string | null;
  onSelectObject?: (id: string | null) => void;
  markdownText?: string;
  onInsertToc?: (tocMarkdown: string) => void;
  initialTab?: SidebarTab;
  onClose: () => void;
}

export const PdfPageListSidebar: React.FC<Props> = ({
  pdfDoc,
  totalPages,
  currentPage,
  onPageChange,
  allPagesObjects = {},
  selectedObjectId,
  onSelectObject,
  markdownText,
  onInsertToc,
  initialTab = 'pages',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>(initialTab);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<number, boolean>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'annotated' | 'empty'>('all');
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Sync initialTab when changed from outside
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const activeCardRef = useRef<HTMLDivElement>(null);

  // Generate page thumbnails lazily or upon mount
  useEffect(() => {
    if (!pdfDoc || totalPages <= 0) return;

    let isMounted = true;

    const loadThumbnails = async () => {
      // Prioritize current page and first few pages
      const priorityOrder = [
        currentPage,
        ...Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p !== currentPage),
      ];

      for (const pageNum of priorityOrder) {
        if (!isMounted) break;
        if (thumbnails[pageNum]) continue;

        setLoadingThumbnails((prev) => ({ ...prev, [pageNum]: true }));
        try {
          const thumb = await renderPageThumbnail(pdfDoc, pageNum, 160);
          if (isMounted && thumb) {
            setThumbnails((prev) => ({ ...prev, [pageNum]: thumb }));
          }
        } catch (e) {
          console.warn(`Could not render thumbnail for page ${pageNum}`, e);
        } finally {
          if (isMounted) {
            setLoadingThumbnails((prev) => ({ ...prev, [pageNum]: false }));
          }
        }
      }
    };

    loadThumbnails();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, totalPages]);

  // Scroll active card into view when currentPage changes
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpPageInput('');
    }
  };

  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

  const filteredPages = pagesArray.filter((pageNum) => {
    const objs = allPagesObjects[pageNum] || [];
    if (filterMode === 'annotated') return objs.length > 0;
    if (filterMode === 'empty') return objs.length === 0;
    return true;
  });

  return (
    <aside className="w-64 sm:w-72 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none z-20 transition-all duration-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
            {activeTab === 'pages' ? <Layers className="w-3.5 h-3.5" /> : <ListTree className="w-3.5 h-3.5" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{activeTab === 'pages' ? 'PDF 頁面清單' : 'PDF 文件大綱'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                共 {totalPages} 頁
              </span>
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
          title="收合側邊欄"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Header: 頁面縮圖 vs PDF 大綱 */}
      <div className="flex items-center px-2.5 py-1.5 gap-1 border-b border-slate-800/80 bg-slate-950/40">
        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
          title="瀏覽所有 PDF 頁面縮圖"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>頁面縮圖</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'outline'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
          title="檢視 PDF 文件的章節目錄與原生書籤大綱"
        >
          <ListTree className="w-3.5 h-3.5" />
          <span>PDF 大綱</span>
        </button>
      </div>

      {/* Tab Content: Document Outline View */}
      {activeTab === 'outline' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <DocumentOutlineView
            pdfDoc={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={onPageChange}
            onInsertToc={onInsertToc}
            variant="sidebar"
          />
        </div>
      ) : (
        <>
          {/* Quick jump & Filter toolbar */}
          <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/40 flex flex-col gap-2 text-xs">
        {/* Quick jump input */}
        <form onSubmit={handleJump} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              placeholder={`跳至 1~${totalPages} 頁...`}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={!jumpPageInput}
            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs transition cursor-pointer shrink-0"
          >
            跳轉
          </button>
        </form>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 text-[11px] bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 rounded text-center font-medium transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            全部 ({totalPages})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('annotated')}
            className={`flex-1 py-1 rounded text-center font-medium transition cursor-pointer ${
              filterMode === 'annotated'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            已標註
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('empty')}
            className={`flex-1 py-1 rounded text-center font-medium transition cursor-pointer ${
              filterMode === 'empty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            未標註
          </button>
        </div>
      </div>

      {/* Pages scroll list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredPages.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            無符合條件的頁面
          </div>
        ) : (
          filteredPages.map((pageNum) => {
            const isCurrent = pageNum === currentPage;
            const pageObjects = allPagesObjects[pageNum] || [];
            const objectCount = pageObjects.length;
            const thumbUrl = thumbnails[pageNum];
            const isLoadingThumb = loadingThumbnails[pageNum];

            const convertedCount = pageObjects.filter((o) => !!o.markdownResult).length;
            const isAllConverted = objectCount > 0 && convertedCount === objectCount;

            return (
              <div
                key={pageNum}
                ref={isCurrent ? activeCardRef : null}
                onClick={() => onPageChange(pageNum)}
                className={`group relative rounded-xl p-2.5 transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-sm'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Header inside card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      第 {pageNum} 頁
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700/50 px-1.5 py-0.2 rounded-full">
                        正在編輯
                      </span>
                    )}
                  </div>

                  {/* Object count or conversion state */}
                  {objectCount > 0 ? (
                    <span
                      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                        isAllConverted
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60'
                          : 'text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60'
                      }`}
                    >
                      {isAllConverted ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span>已轉換 ({objectCount})</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>{objectCount} 個物件</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      尚未標註
                    </span>
                  )}
                </div>

                {/* Page Thumbnail Preview Container */}
                <div className="relative aspect-[3/4] w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group-hover:border-slate-400 dark:group-hover:border-slate-700 transition">
                  {thumbUrl ? (
                    <>
                      <img
                        src={thumbUrl}
                        alt={`Page ${pageNum} preview`}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />

                      {/* Translucent overlay highlights for object bounding boxes with category color */}
                      {objectCount > 0 && (
                        <div className="absolute inset-0 pointer-events-none p-1">
                          <div className="relative w-full h-full">
                            {pageObjects.map((obj) => {
                              const theme = getObjectTheme(obj);
                              return (
                                <div
                                  key={obj.id}
                                  className={`absolute border ${theme.borderBox} ${theme.bgBox} rounded-[2px]`}
                                  style={{
                                    left: `${Math.min(90, Math.max(0, (obj.box.x / 600) * 100))}%`,
                                    top: `${Math.min(90, Math.max(0, (obj.box.y / 800) * 100))}%`,
                                    width: `${Math.min(95, Math.max(10, (obj.box.width / 600) * 100))}%`,
                                    height: `${Math.min(95, Math.max(5, (obj.box.height / 800) * 100))}%`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : isLoadingThumb ? (
                    <div className="flex flex-col items-center gap-1.5 text-slate-500">
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <span className="text-[10px]">載入縮圖中...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-600">
                      <FileText className="w-8 h-8 opacity-40" />
                      <span className="text-[10px]">第 {pageNum} 頁</span>
                    </div>
                  )}

                  {/* Hover indicator overlay */}
                  <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                      <span>跳至此頁</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                    </span>
                  </div>
                </div>

                {/* Page breakdown icons (if objects exist) */}
                {objectCount > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    {pageObjects.slice(0, 4).map((obj) => {
                      const cfg = CONVERSION_TYPE_CONFIGS[obj.conversionType as keyof typeof CONVERSION_TYPE_CONFIGS];
                      if (!cfg) return null;
                      return (
                        <span
                          key={obj.id}
                          className={`text-[9px] px-1 py-0.2 rounded border font-mono ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}
                          title={cfg.label}
                        >
                          {cfg.shortLabel}
                        </span>
                      );
                    })}
                    {pageObjects.length > 4 && (
                      <span className="text-[9px] text-slate-500 font-mono">
                        +{pageObjects.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer information */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>共 {totalPages} 頁</span>
        </span>
        <button
          type="button"
          onClick={() => {
            const next = currentPage < totalPages ? currentPage + 1 : 1;
            onPageChange(next);
          }}
          className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
        >
          下一頁 →
        </button>
      </div>
      </>
      )}
    </aside>
  );
};
