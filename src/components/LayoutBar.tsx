import React from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Columns2,
  FileCheck2,
  Columns,
  Code2,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { ViewLayout, ThemeMode } from '../types';

interface LayoutBarProps {
  // Left: Toggle PDF Page List Sidebar (Icon only)
  showPageList?: boolean;
  onTogglePageList?: () => void;
  isPdfVisible?: boolean;

  // Center: Main Layout Modes
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;

  // Right: Theme Mode Switcher (Default: Dark) & Toggle Right Sidebar Button (Icon only)
  themeMode?: ThemeMode;
  onThemeModeChange?: (mode: ThemeMode) => void;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
}

export const LayoutBar: React.FC<LayoutBarProps> = ({
  showPageList,
  onTogglePageList,
  isPdfVisible = true,
  viewLayout,
  onViewLayoutChange,
  themeMode = 'dark',
  onThemeModeChange,
  isRightSidebarOpen,
  onToggleRightSidebar,
}) => {
  return (
    <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 select-none relative z-50 text-xs overflow-visible">
      {/* LEFT: Toggle PDF Page List Sidebar (Icon only) */}
      <div className="flex items-center shrink-0 min-w-[120px]">
        {onTogglePageList && (
          <button
            type="button"
            disabled={!isPdfVisible}
            onClick={onTogglePageList}
            className={`p-1.5 rounded-lg border transition flex items-center justify-center shrink-0 ${
              !isPdfVisible
                ? 'bg-slate-950/60 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-40'
                : showPageList
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs cursor-pointer'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800 cursor-pointer'
            }`}
            title={
              !isPdfVisible
                ? '左側邊欄 (僅在 PDF 模式啟用)'
                : showPageList
                ? '收合左側邊欄 (PdfPageListSidebar)'
                : '展開左側邊欄 (PdfPageListSidebar)'
            }
          >
            {showPageList ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* CENTER: Main Layout Modes (置中) */}
      <div className="flex items-center justify-center flex-1 mx-2">
        <div
          className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 gap-0.5 shrink-0 shadow-xs"
          title="主要版面配置模式 (Main Layout Modes)"
        >
          <button
            type="button"
            onClick={() => onViewLayoutChange('pdf')}
            className={`p-1.5 rounded transition cursor-pointer ${
              viewLayout === 'pdf'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="1. 專注 PDF 預覽與選取"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewLayoutChange('split')}
            className={`p-1.5 rounded transition cursor-pointer ${
              viewLayout === 'split'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="2. 雙欄分割檢視 (PDF + Markdown)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewLayoutChange('markdown_preview')}
            className={`p-1.5 rounded transition cursor-pointer ${
              viewLayout === 'markdown_preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="3. 專注 Markdown 產出與排版"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewLayoutChange('markdown_split')}
            className={`p-1.5 rounded transition cursor-pointer ${
              viewLayout === 'markdown_split'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="4. 雙欄分割檢視 (Markdown + Markdown 原始碼)"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewLayoutChange('markdown_raw')}
            className={`p-1.5 rounded transition cursor-pointer ${
              viewLayout === 'markdown_raw'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="5. 專注 Markdown 原始碼"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RIGHT: Dark / Light / System Mode Switcher & Toggle Right Sidebar Button (Icon only) */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-[120px]">
        {/* Dark / Light / System Mode Switcher (Default: Dark) */}
        {onThemeModeChange && (
          <div
            className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 gap-0.5 shrink-0"
            title="外觀主題模式 (預設 Dark Mode)"
          >
            <button
              type="button"
              onClick={() => onThemeModeChange('dark')}
              className={`p-1.5 rounded transition cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="深色模式 (Dark Mode - 預設)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onThemeModeChange('light')}
              className={`p-1.5 rounded transition cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="淺色模式 (Light Mode)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onThemeModeChange('system')}
              className={`p-1.5 rounded transition cursor-pointer ${
                themeMode === 'system'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="跟隨系統 (System Mode)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toggle Right Sidebar Button (Icon only) */}
        {onToggleRightSidebar && (
          <button
            type="button"
            onClick={onToggleRightSidebar}
            className={`p-1.5 rounded-lg border transition cursor-pointer shadow-xs flex items-center justify-center shrink-0 ${
              isRightSidebarOpen
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-900/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isRightSidebarOpen ? '收合右側邊欄 (RightSideBar)' : '展開右側邊欄 (RightSideBar)'}
          >
            {isRightSidebarOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};
