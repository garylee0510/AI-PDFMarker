import React, { useState, useEffect, useMemo } from 'react';
import { PDFObjectItem, ConversionType } from '../types';
import {
  CONVERSION_TYPE_CONFIGS,
  getObjectTheme,
  PRESET_COLOR_MARKS,
} from './ConversionTypeBadge';
import { formatInstantMarkdown, renderMarkdownHtml } from '../utils/markdownFormatter';
import {
  Sparkles,
  Trash2,
  X,
  RotateCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Code2,
  Palette,
  ScanLine,
  Lock,
  Unlock,
  SlidersHorizontal,
  Layers,
  MousePointerClick,
  FileText,
  PanelRightClose,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
} from 'lucide-react';

export interface RightSidebarProps {
  selectedObject: PDFObjectItem | null;
  currentPageObjects?: PDFObjectItem[];
  onSelectObjectId?: (id: string) => void;
  onUpdate: (updated: PDFObjectItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onConvertNow: (item: PDFObjectItem) => Promise<void>;
  onAutoAlign?: (id: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onMoveObject?: (id: string, direction: 'up' | 'down') => void;
  onClearPageObjects?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  objectIndex?: number;
  totalObjects?: number;
  currentPage?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedObject,
  currentPageObjects = [],
  onSelectObjectId,
  onUpdate,
  onDelete,
  onClose,
  onConvertNow,
  onAutoAlign,
  onNavigate,
  onMoveObject,
  onClearPageObjects,
  hasPrev = false,
  hasNext = false,
  objectIndex = 0,
  totalObjects = 0,
  currentPage = 1,
}) => {
  const [localItem, setLocalItem] = useState<PDFObjectItem | null>(selectedObject);
  const [copied, setCopied] = useState(false);
  const [outputTab, setOutputTab] = useState<'preview' | 'code'>('preview');

  useEffect(() => {
    if (!selectedObject) {
      setLocalItem(null);
      return;
    }

    if (!selectedObject.markdownResult) {
      const initialMd = formatInstantMarkdown(
        selectedObject.rawText,
        selectedObject.conversionType,
        selectedObject.cropImageDataUrl
      );
      setLocalItem({ ...selectedObject, markdownResult: initialMd });
    } else {
      setLocalItem(selectedObject);
    }
  }, [selectedObject]);

  const activeTheme = useMemo(() => {
    if (!localItem) return null;
    return getObjectTheme(localItem);
  }, [localItem?.conversionType, localItem?.customColor]);

  const activeConfig = useMemo(() => {
    if (!localItem) return CONVERSION_TYPE_CONFIGS.paragraph;
    return (
      CONVERSION_TYPE_CONFIGS[localItem.conversionType] ||
      CONVERSION_TYPE_CONFIGS.paragraph
    );
  }, [localItem?.conversionType]);

  const handleTypeSelect = (type: ConversionType) => {
    if (!localItem) return;
    const newMd = formatInstantMarkdown(
      localItem.rawText,
      type,
      localItem.cropImageDataUrl
    );

    const updated: PDFObjectItem = {
      ...localItem,
      conversionType: type,
      markdownResult: newMd,
    };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleCustomColorChange = (colorKey?: string) => {
    if (!localItem) return;
    const updated: PDFObjectItem = {
      ...localItem,
      customColor: colorKey,
    };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleToggleLock = () => {
    if (!localItem) return;
    const updated: PDFObjectItem = {
      ...localItem,
      isLocked: !localItem.isLocked,
    };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleCustomInstructionChange = (text: string) => {
    if (!localItem) return;
    const updated = { ...localItem, customInstruction: text };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleMarkdownChange = (text: string) => {
    if (!localItem) return;
    const updated = { ...localItem, markdownResult: text };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const currentMarkdown = useMemo(() => {
    if (!localItem) return '';
    return (
      localItem.markdownResult ||
      formatInstantMarkdown(
        localItem.rawText,
        localItem.conversionType,
        localItem.cropImageDataUrl
      )
    );
  }, [localItem]);

  const renderedHtml = useMemo(() => {
    return renderMarkdownHtml(currentMarkdown);
  }, [currentMarkdown]);

  const handleCopyMarkdown = () => {
    if (currentMarkdown) {
      navigator.clipboard.writeText(currentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const ActiveIcon = activeConfig.icon;

  return (
    <aside className="w-80 sm:w-88 xl:w-[410px] h-full bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shrink-0 select-none z-30 transition-all duration-200 shadow-2xl overflow-hidden">
      {/* If no object is selected, render RightSidebar "物件順序" (Object Sequence) */}
      {!localItem ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <ListOrdered className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                  <span>物件順序</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    共 {currentPageObjects.length} 個
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400">
                  第 {currentPage} 頁 · 調整閱讀與 Markdown 排版順序
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {currentPageObjects.length > 0 && onClearPageObjects && (
                <button
                  type="button"
                  onClick={onClearPageObjects}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer transition"
                  title="清除本頁所有物件"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                title="收合右側邊欄"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick guide */}
          <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>點選物件編輯屬性，使用箭頭排序：</span>
            </span>
          </div>

          {/* Object items sequence list on current page */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {currentPageObjects.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <ListOrdered className="w-8 h-8 opacity-40 text-slate-400" />
                <span className="font-semibold text-slate-400">本頁尚無已標註物件</span>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  在左側 PDF 中拖曳框選標題、表格、公式或段落，即可加入本頁物件清單。
                </p>
              </div>
            ) : (
              currentPageObjects.map((obj, idx) => {
                const conf =
                  CONVERSION_TYPE_CONFIGS[obj.conversionType] ||
                  CONVERSION_TYPE_CONFIGS.paragraph;
                const theme = getObjectTheme(obj);
                const Icon = conf.icon;

                return (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObjectId?.(obj.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-xs font-mono text-slate-400 w-5 shrink-0 font-bold">
                        #{idx + 1}
                      </span>

                      {obj.cropImageDataUrl ? (
                        <img
                          src={obj.cropImageDataUrl}
                          alt="Crop"
                          className="w-10 h-8 object-contain rounded bg-slate-950 border border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {conf.shortLabel}
                          </span>
                          {obj.isLocked && (
                            <span title="已鎖定">
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                            </span>
                          )}
                          {obj.markdownResult ? (
                            <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                              ✓ 完成
                            </span>
                          ) : (
                            <span className="text-[9px] text-sky-400 font-mono bg-sky-950/60 px-1 py-0.2 rounded border border-sky-800/40">
                              即時預覽
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono max-w-[150px] sm:max-w-[170px]">
                          {obj.markdownResult
                            ? obj.markdownResult.slice(0, 40)
                            : obj.rawText || '已標註物件'}
                        </div>
                      </div>
                    </div>

                    {/* Sequence Reordering and Delete Controls */}
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {onMoveObject && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveObject(obj.id, 'up');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer transition"
                            title="往前移動 (上移順序)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === currentPageObjects.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveObject(obj.id, 'down');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer transition"
                            title="往後移動 (下移順序)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(obj.id);
                        }}
                        className="p-1 rounded text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer transition ml-0.5"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* If an object is selected, render full RightSidebar configuration editor (物件屬性) */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Back to Object Sequence */}
              <button
                type="button"
                onClick={() => onSelectObjectId?.('')}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition shrink-0"
                title="返回物件順序清單"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {activeTheme && (
                <div
                  className={`w-3 h-3 rounded-full ${activeTheme.badgeDot} ring-2 ${activeTheme.ringBox} shadow-md shrink-0`}
                  title={`色彩標記：${activeTheme.name}`}
                />
              )}
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-xs text-slate-100 whitespace-nowrap">
                  物件 #{objectIndex + 1} 屬性
                </h3>
                {activeTheme && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${activeTheme.badgeBg} ${activeTheme.badgeText} ${activeTheme.badgeBorder}`}
                  >
                    <ActiveIcon className="w-3 h-3" />
                    <span>{activeConfig.shortLabel}</span>
                  </span>
                )}
              </div>
              {totalObjects > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                  {objectIndex + 1}/{totalObjects}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onNavigate && (
                <>
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => onNavigate('prev')}
                    className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 cursor-pointer"
                    title="上一個物件"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => onNavigate('next')}
                    className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 cursor-pointer"
                    title="下一個物件"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleToggleLock}
                className={`p-1 rounded-md transition cursor-pointer ml-0.5 ${
                  localItem.isLocked
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-600/70 hover:bg-amber-900/60 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={
                  localItem.isLocked
                    ? '解除鎖定物件 (目前禁止拖曳與縮放)'
                    : '鎖定物件 (禁止拖曳或調整大小)'
                }
              >
                {localItem.isLocked ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 ml-1 cursor-pointer transition"
                title="收合右側邊欄"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visual Category Color Marking Banner */}
          {activeTheme && (
            <div className={`p-3 border-b border-slate-800 ${activeTheme.chipBg} transition-colors shrink-0`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    標註類別色彩標記
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${activeTheme.badgeBg} ${activeTheme.badgeBorder} ${activeTheme.badgeText}`}
                >
                  {activeTheme.name}
                </span>
              </div>

              {/* Accent bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-1.5 flex-1 rounded-full ${activeTheme.accentBar}`} />
                <span className="text-[10px] text-slate-400 font-mono">{activeTheme.hex}</span>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLOR_MARKS.map((mark) => {
                  const isCurrent = (localItem.customColor || 'auto') === mark.key;
                  return (
                    <button
                      key={mark.key}
                      type="button"
                      onClick={() => handleCustomColorChange(mark.key === 'auto' ? undefined : mark.key)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-400 dark:border-white/70 shadow-xs ring-1 ring-slate-400/50 dark:ring-white/40 font-semibold'
                          : 'bg-white/80 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                      title={`設定色彩為：${mark.name}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${mark.colorClass} ${
                          isCurrent ? 'ring-1 ring-slate-700 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''
                        }`}
                      />
                      <span>{mark.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Snapshot Preview & Coordinates */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-400">框選影像截圖</span>
                {activeTheme && (
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.badgeDot}`} />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-mono">
                  {Math.round(localItem.box.width)} × {Math.round(localItem.box.height)} px
                </span>
                {onAutoAlign && (
                  <button
                    type="button"
                    onClick={() => onAutoAlign(localItem.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-medium transition cursor-pointer shadow-xs border border-emerald-500/50"
                    title="自動對齊物件 (貼齊內容位置與大小)"
                  >
                    <ScanLine className="w-3 h-3" />
                    <span>自動對齊</span>
                  </button>
                )}
              </div>
            </div>

            {localItem.cropImageDataUrl ? (
              <div
                className={`max-h-24 overflow-hidden rounded-md border-2 ${
                  activeTheme?.cardBorder || 'border-slate-800'
                } bg-slate-950 flex items-center justify-center p-1 transition-colors`}
              >
                <img
                  src={localItem.cropImageDataUrl}
                  alt="Object crop"
                  className="max-h-22 object-contain rounded"
                />
              </div>
            ) : (
              <div className="h-12 rounded border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                尚未擷取截圖
              </div>
            )}

            {localItem.rawText && (
              <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800/80 font-mono line-clamp-2">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-sans mb-0.5 font-medium">
                  擷取純文字：
                </span>
                {localItem.rawText}
              </div>
            )}
          </div>

          {/* Conversion Type Selector & Main Settings */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                  指定轉換為 Markdown 格式
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">點選立即套用對應色彩</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(CONVERSION_TYPE_CONFIGS).map((conf) => {
                  const isSelected = localItem.conversionType === conf.type;
                  const Icon = conf.icon;
                  const theme = conf.theme;
                  return (
                    <button
                      key={conf.type}
                      type="button"
                      onClick={() => handleTypeSelect(conf.type)}
                      className={`conversion-type-btn flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? `${theme.badgeBg} ${theme.borderBox} ring-2 ${theme.ringBox} shadow-xs is-selected`
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="relative mt-0.5 shrink-0">
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected ? theme.badgeText : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${theme.badgeDot}`}
                        />
                      </div>
                      <div className="overflow-hidden">
                        <div
                          className={`type-label truncate font-semibold text-xs ${
                            isSelected
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {conf.label}
                        </div>
                        <div
                          className={`type-sublabel text-[10px] truncate leading-tight mt-0.5 ${
                            isSelected
                              ? 'text-slate-600 dark:text-slate-300 font-medium'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {conf.shortLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom instruction / Prompt */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                自訂微調轉換指令 (選填)
              </label>
              <input
                type="text"
                placeholder="例如：整理為繁體中文、保留千分位符號、簡化表頭..."
                value={localItem.customInstruction || ''}
                onChange={(e) => handleCustomInstructionChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Action Button: Trigger AI Conversion */}
            <div className="pt-1">
              <button
                type="button"
                disabled={localItem.isConverting}
                onClick={() => onConvertNow(localItem)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {localItem.isConverting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>AI 正在轉換此物件...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI 深度最佳化 Markdown</span>
                  </>
                )}
              </button>
            </div>

            {/* Error notification */}
            {localItem.error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <div className="font-medium">轉換失敗</div>
                  <div className="text-rose-400 text-[11px] mt-0.5">{localItem.error}</div>
                </div>
              </div>
            )}

            {/* Real-time Rendered Markdown vs Raw Code Preview */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOutputTab('preview')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer font-medium ${
                      outputTab === 'preview'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>真正排版預覽</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputTab('code')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer font-medium ${
                      outputTab === 'code'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Markdown 語法</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>複製</span>
                    </>
                  )}
                </button>
              </div>

              {outputTab === 'preview' ? (
                <div className="p-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  <div
                    className="markdown-body text-xs"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
              ) : (
                <textarea
                  rows={5}
                  value={localItem.markdownResult || ''}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  placeholder="Markdown 語法將在此顯示，可直接微調..."
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-emerald-300 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                />
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDelete(localItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>刪除物件</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

// Also export as ObjectConfigDrawer for backward compatibility
export const ObjectConfigDrawer = RightSidebar;
