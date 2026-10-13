import React from 'react';
import { ConversionType } from '../types';
import {
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  Table,
  Code,
  Sigma,
  Image,
  List,
  ListOrdered,
  Quote,
  AlertCircle,
  Sparkles,
  Ban,
  Wand2,
} from 'lucide-react';

export interface CategoryColorTheme {
  name: string;
  colorKey: string;
  hex: string;
  bgBox: string;
  bgBoxHover: string;
  borderBox: string;
  ringBox: string;
  shadowBox: string;
  handleBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeDot: string;
  accentBar: string;
  cardBorder: string;
  chipBg: string;
}

export const CATEGORY_COLOR_THEMES: Record<string, CategoryColorTheme> = {
  purple: {
    name: '紫色 (Heading)',
    colorKey: 'purple',
    hex: '#a855f7',
    bgBox: 'bg-purple-500/20',
    bgBoxHover: 'hover:bg-purple-500/30',
    borderBox: 'border-purple-500',
    ringBox: 'ring-purple-400',
    shadowBox: 'shadow-purple-500/10 dark:shadow-purple-950/60',
    handleBorder: 'border-purple-500',
    badgeBg: 'bg-purple-100/90 dark:bg-purple-950',
    badgeBorder: 'border-purple-300 dark:border-purple-500',
    badgeText: 'text-purple-800 dark:text-purple-200',
    badgeDot: 'bg-purple-500 dark:bg-purple-400',
    accentBar: 'bg-purple-500 dark:bg-purple-600',
    cardBorder: 'border-purple-300 dark:border-purple-500/40',
    chipBg: 'bg-purple-50/90 dark:bg-purple-950/80',
  },
  indigo: {
    name: '靛青 (Heading 2)',
    colorKey: 'indigo',
    hex: '#6366f1',
    bgBox: 'bg-indigo-500/20',
    bgBoxHover: 'hover:bg-indigo-500/30',
    borderBox: 'border-indigo-500',
    ringBox: 'ring-indigo-400',
    shadowBox: 'shadow-indigo-500/10 dark:shadow-indigo-950/60',
    handleBorder: 'border-indigo-500',
    badgeBg: 'bg-indigo-100/90 dark:bg-indigo-950',
    badgeBorder: 'border-indigo-300 dark:border-indigo-500',
    badgeText: 'text-indigo-800 dark:text-indigo-200',
    badgeDot: 'bg-indigo-500 dark:bg-indigo-400',
    accentBar: 'bg-indigo-500 dark:bg-indigo-600',
    cardBorder: 'border-indigo-300 dark:border-indigo-500/40',
    chipBg: 'bg-indigo-50/90 dark:bg-indigo-950/80',
  },
  blue: {
    name: '藍色 (Heading 3)',
    colorKey: 'blue',
    hex: '#3b82f6',
    bgBox: 'bg-blue-500/20',
    bgBoxHover: 'hover:bg-blue-500/30',
    borderBox: 'border-blue-500',
    ringBox: 'ring-blue-400',
    shadowBox: 'shadow-blue-500/10 dark:shadow-blue-950/60',
    handleBorder: 'border-blue-500',
    badgeBg: 'bg-blue-100/90 dark:bg-blue-950',
    badgeBorder: 'border-blue-300 dark:border-blue-500',
    badgeText: 'text-blue-800 dark:text-blue-200',
    badgeDot: 'bg-blue-500 dark:bg-blue-400',
    accentBar: 'bg-blue-500 dark:bg-blue-600',
    cardBorder: 'border-blue-300 dark:border-blue-500/40',
    chipBg: 'bg-blue-50/90 dark:bg-blue-950/80',
  },
  emerald: {
    name: '翡翠綠 (Table)',
    colorKey: 'emerald',
    hex: '#10b981',
    bgBox: 'bg-emerald-500/20',
    bgBoxHover: 'hover:bg-emerald-500/30',
    borderBox: 'border-emerald-500',
    ringBox: 'ring-emerald-400',
    shadowBox: 'shadow-emerald-500/10 dark:shadow-emerald-950/60',
    handleBorder: 'border-emerald-500',
    badgeBg: 'bg-emerald-100/90 dark:bg-emerald-950',
    badgeBorder: 'border-emerald-300 dark:border-emerald-500',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    badgeDot: 'bg-emerald-500 dark:bg-emerald-400',
    accentBar: 'bg-emerald-500 dark:bg-emerald-600',
    cardBorder: 'border-emerald-300 dark:border-emerald-500/40',
    chipBg: 'bg-emerald-50/90 dark:bg-emerald-950/80',
  },
  rose: {
    name: '玫瑰紅 (Math)',
    colorKey: 'rose',
    hex: '#f43f5e',
    bgBox: 'bg-rose-500/20',
    bgBoxHover: 'hover:bg-rose-500/30',
    borderBox: 'border-rose-500',
    ringBox: 'ring-rose-400',
    shadowBox: 'shadow-rose-500/10 dark:shadow-rose-950/60',
    handleBorder: 'border-rose-500',
    badgeBg: 'bg-rose-100/90 dark:bg-rose-950',
    badgeBorder: 'border-rose-300 dark:border-rose-500',
    badgeText: 'text-rose-800 dark:text-rose-200',
    badgeDot: 'bg-rose-500 dark:bg-rose-400',
    accentBar: 'bg-rose-500 dark:bg-rose-600',
    cardBorder: 'border-rose-300 dark:border-rose-500/40',
    chipBg: 'bg-rose-50/90 dark:bg-rose-950/80',
  },
  amber: {
    name: '琥珀金 (Code)',
    colorKey: 'amber',
    hex: '#f59e0b',
    bgBox: 'bg-amber-500/20',
    bgBoxHover: 'hover:bg-amber-500/30',
    borderBox: 'border-amber-500',
    ringBox: 'ring-amber-400',
    shadowBox: 'shadow-amber-500/10 dark:shadow-amber-950/60',
    handleBorder: 'border-amber-500',
    badgeBg: 'bg-amber-100/90 dark:bg-amber-950',
    badgeBorder: 'border-amber-300 dark:border-amber-500',
    badgeText: 'text-amber-900 dark:text-amber-200',
    badgeDot: 'bg-amber-500 dark:bg-amber-400',
    accentBar: 'bg-amber-500 dark:bg-amber-600',
    cardBorder: 'border-amber-300 dark:border-amber-500/40',
    chipBg: 'bg-amber-50/90 dark:bg-amber-950/80',
  },
  sky: {
    name: '天藍 (Paragraph)',
    colorKey: 'sky',
    hex: '#0284c7',
    bgBox: 'bg-sky-500/20',
    bgBoxHover: 'hover:bg-sky-500/30',
    borderBox: 'border-sky-500',
    ringBox: 'ring-sky-400',
    shadowBox: 'shadow-sky-500/10 dark:shadow-sky-950/60',
    handleBorder: 'border-sky-500',
    badgeBg: 'bg-sky-100/90 dark:bg-sky-950',
    badgeBorder: 'border-sky-300 dark:border-sky-500',
    badgeText: 'text-sky-800 dark:text-sky-200',
    badgeDot: 'bg-sky-500 dark:bg-sky-400',
    accentBar: 'bg-sky-500 dark:bg-sky-600',
    cardBorder: 'border-sky-300 dark:border-sky-500/40',
    chipBg: 'bg-sky-50/90 dark:bg-sky-950/80',
  },
  pink: {
    name: '櫻花粉 (Image/Chart)',
    colorKey: 'pink',
    hex: '#ec4899',
    bgBox: 'bg-pink-500/20',
    bgBoxHover: 'hover:bg-pink-500/30',
    borderBox: 'border-pink-500',
    ringBox: 'ring-pink-400',
    shadowBox: 'shadow-pink-500/10 dark:shadow-pink-950/60',
    handleBorder: 'border-pink-500',
    badgeBg: 'bg-pink-100/90 dark:bg-pink-950',
    badgeBorder: 'border-pink-300 dark:border-pink-500',
    badgeText: 'text-pink-800 dark:text-pink-200',
    badgeDot: 'bg-pink-500 dark:bg-pink-400',
    accentBar: 'bg-pink-500 dark:bg-pink-600',
    cardBorder: 'border-pink-300 dark:border-pink-500/40',
    chipBg: 'bg-pink-50/90 dark:bg-pink-950/80',
  },
  teal: {
    name: '松石綠 (Bullet List)',
    colorKey: 'teal',
    hex: '#14b8a6',
    bgBox: 'bg-teal-500/20',
    bgBoxHover: 'hover:bg-teal-500/30',
    borderBox: 'border-teal-500',
    ringBox: 'ring-teal-400',
    shadowBox: 'shadow-teal-500/10 dark:shadow-teal-950/60',
    handleBorder: 'border-teal-500',
    badgeBg: 'bg-teal-100/90 dark:bg-teal-950',
    badgeBorder: 'border-teal-300 dark:border-teal-500',
    badgeText: 'text-teal-800 dark:text-teal-200',
    badgeDot: 'bg-teal-500 dark:bg-teal-400',
    accentBar: 'bg-teal-500 dark:bg-teal-600',
    cardBorder: 'border-teal-300 dark:border-teal-500/40',
    chipBg: 'bg-teal-50/90 dark:bg-teal-950/80',
  },
  cyan: {
    name: '青藍色 (Numbered List)',
    colorKey: 'cyan',
    hex: '#06b6d4',
    bgBox: 'bg-cyan-500/20',
    bgBoxHover: 'hover:bg-cyan-500/30',
    borderBox: 'border-cyan-500',
    ringBox: 'ring-cyan-400',
    shadowBox: 'shadow-cyan-500/10 dark:shadow-cyan-950/60',
    handleBorder: 'border-cyan-500',
    badgeBg: 'bg-cyan-100/90 dark:bg-cyan-950',
    badgeBorder: 'border-cyan-300 dark:border-cyan-500',
    badgeText: 'text-cyan-800 dark:text-cyan-200',
    badgeDot: 'bg-cyan-500 dark:bg-cyan-400',
    accentBar: 'bg-cyan-500 dark:bg-cyan-600',
    cardBorder: 'border-cyan-300 dark:border-cyan-500/40',
    chipBg: 'bg-cyan-50/90 dark:bg-cyan-950/80',
  },
  violet: {
    name: '紫羅蘭 (Quote)',
    colorKey: 'violet',
    hex: '#8b5cf6',
    bgBox: 'bg-violet-500/20',
    bgBoxHover: 'hover:bg-violet-500/30',
    borderBox: 'border-violet-500',
    ringBox: 'ring-violet-400',
    shadowBox: 'shadow-violet-500/10 dark:shadow-violet-950/60',
    handleBorder: 'border-violet-500',
    badgeBg: 'bg-violet-100/90 dark:bg-violet-950',
    badgeBorder: 'border-violet-300 dark:border-violet-500',
    badgeText: 'text-violet-800 dark:text-violet-200',
    badgeDot: 'bg-violet-500 dark:bg-violet-400',
    accentBar: 'bg-violet-500 dark:bg-violet-600',
    cardBorder: 'border-violet-300 dark:border-violet-500/40',
    chipBg: 'bg-violet-50/90 dark:bg-violet-950/80',
  },
  orange: {
    name: '暖橙色 (Callout)',
    colorKey: 'orange',
    hex: '#f97316',
    bgBox: 'bg-orange-500/20',
    bgBoxHover: 'hover:bg-orange-500/30',
    borderBox: 'border-orange-500',
    ringBox: 'ring-orange-400',
    shadowBox: 'shadow-orange-500/10 dark:shadow-orange-950/60',
    handleBorder: 'border-orange-500',
    badgeBg: 'bg-orange-100/90 dark:bg-orange-950',
    badgeBorder: 'border-orange-300 dark:border-orange-500',
    badgeText: 'text-orange-900 dark:text-orange-200',
    badgeDot: 'bg-orange-500 dark:bg-orange-400',
    accentBar: 'bg-orange-500 dark:bg-orange-600',
    cardBorder: 'border-orange-300 dark:border-orange-500/40',
    chipBg: 'bg-orange-50/90 dark:bg-orange-950/80',
  },
  yellow: {
    name: '明黃色 (Auto Detect)',
    colorKey: 'yellow',
    hex: '#eab308',
    bgBox: 'bg-yellow-500/20',
    bgBoxHover: 'hover:bg-yellow-500/30',
    borderBox: 'border-yellow-500',
    ringBox: 'ring-yellow-400',
    shadowBox: 'shadow-yellow-500/10 dark:shadow-yellow-950/60',
    handleBorder: 'border-yellow-500',
    badgeBg: 'bg-yellow-100/90 dark:bg-yellow-950',
    badgeBorder: 'border-yellow-300 dark:border-yellow-500',
    badgeText: 'text-yellow-900 dark:text-yellow-200',
    badgeDot: 'bg-yellow-500 dark:bg-yellow-400',
    accentBar: 'bg-yellow-500 dark:bg-yellow-600',
    cardBorder: 'border-yellow-300 dark:border-yellow-500/40',
    chipBg: 'bg-yellow-50/90 dark:bg-yellow-950/80',
  },
  fuchsia: {
    name: '洋紅色 (Custom)',
    colorKey: 'fuchsia',
    hex: '#d946ef',
    bgBox: 'bg-fuchsia-500/20',
    bgBoxHover: 'hover:bg-fuchsia-500/30',
    borderBox: 'border-fuchsia-500',
    ringBox: 'ring-fuchsia-400',
    shadowBox: 'shadow-fuchsia-500/10 dark:shadow-fuchsia-950/60',
    handleBorder: 'border-fuchsia-500',
    badgeBg: 'bg-fuchsia-100/90 dark:bg-fuchsia-950',
    badgeBorder: 'border-fuchsia-300 dark:border-fuchsia-500',
    badgeText: 'text-fuchsia-800 dark:text-fuchsia-200',
    badgeDot: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    accentBar: 'bg-fuchsia-500 dark:bg-fuchsia-600',
    cardBorder: 'border-fuchsia-300 dark:border-fuchsia-500/40',
    chipBg: 'bg-fuchsia-50/90 dark:bg-fuchsia-950/80',
  },
  slate: {
    name: '靜音灰 (Ignore)',
    colorKey: 'slate',
    hex: '#64748b',
    bgBox: 'bg-slate-600/20',
    bgBoxHover: 'hover:bg-slate-600/30',
    borderBox: 'border-slate-400 dark:border-slate-500',
    ringBox: 'ring-slate-400',
    shadowBox: 'shadow-slate-500/10 dark:shadow-slate-950/60',
    handleBorder: 'border-slate-500',
    badgeBg: 'bg-slate-200/90 dark:bg-slate-900',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
    badgeText: 'text-slate-800 dark:text-slate-300',
    badgeDot: 'bg-slate-500 dark:bg-slate-400',
    accentBar: 'bg-slate-500 dark:bg-slate-600',
    cardBorder: 'border-slate-300 dark:border-slate-700/60',
    chipBg: 'bg-slate-100 dark:bg-slate-900/80',
  },
};

export const TYPE_COLOR_MAP: Record<ConversionType, CategoryColorTheme> = {
  heading_1: CATEGORY_COLOR_THEMES.purple,
  heading_2: CATEGORY_COLOR_THEMES.indigo,
  heading_3: CATEGORY_COLOR_THEMES.blue,
  paragraph: CATEGORY_COLOR_THEMES.sky,
  table: CATEGORY_COLOR_THEMES.emerald,
  code: CATEGORY_COLOR_THEMES.amber,
  latex_math: CATEGORY_COLOR_THEMES.rose,
  image_caption: CATEGORY_COLOR_THEMES.pink,
  bullet_list: CATEGORY_COLOR_THEMES.teal,
  numbered_list: CATEGORY_COLOR_THEMES.cyan,
  quote: CATEGORY_COLOR_THEMES.violet,
  callout_note: CATEGORY_COLOR_THEMES.orange,
  auto_detect: CATEGORY_COLOR_THEMES.yellow,
  custom: CATEGORY_COLOR_THEMES.fuchsia,
  ignore: CATEGORY_COLOR_THEMES.slate,
};

export interface ColorMarkOption {
  key: string;
  name: string;
  hex: string;
  colorClass: string;
  theme: CategoryColorTheme;
}

export const PRESET_COLOR_MARKS: ColorMarkOption[] = [
  { key: 'auto', name: '預設 (依類型)', hex: '#6366f1', colorClass: 'bg-indigo-500', theme: CATEGORY_COLOR_THEMES.indigo },
  { key: 'purple', name: '標題紫', hex: '#a855f7', colorClass: 'bg-purple-500', theme: CATEGORY_COLOR_THEMES.purple },
  { key: 'emerald', name: '表格綠', hex: '#10b981', colorClass: 'bg-emerald-500', theme: CATEGORY_COLOR_THEMES.emerald },
  { key: 'rose', name: '公式紅', hex: '#f43f5e', colorClass: 'bg-rose-500', theme: CATEGORY_COLOR_THEMES.rose },
  { key: 'amber', name: '程式金', hex: '#f59e0b', colorClass: 'bg-amber-500', theme: CATEGORY_COLOR_THEMES.amber },
  { key: 'sky', name: '段落藍', hex: '#0284c7', colorClass: 'bg-sky-500', theme: CATEGORY_COLOR_THEMES.sky },
  { key: 'pink', name: '圖表粉', hex: '#ec4899', colorClass: 'bg-pink-500', theme: CATEGORY_COLOR_THEMES.pink },
  { key: 'teal', name: '清單青', hex: '#14b8a6', colorClass: 'bg-teal-500', theme: CATEGORY_COLOR_THEMES.teal },
];

export function getObjectTheme(item: { conversionType: ConversionType; customColor?: string }): CategoryColorTheme {
  if (item.customColor && item.customColor !== 'auto' && CATEGORY_COLOR_THEMES[item.customColor]) {
    return CATEGORY_COLOR_THEMES[item.customColor];
  }
  return TYPE_COLOR_MAP[item.conversionType] || CATEGORY_COLOR_THEMES.sky;
}

export interface TypeMeta {
  type: ConversionType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  categoryGroup: 'heading' | 'table' | 'math' | 'code' | 'paragraph' | 'other';
  theme: CategoryColorTheme;
}

export const CONVERSION_TYPE_CONFIGS: Record<ConversionType, TypeMeta> = {
  heading_1: {
    type: 'heading_1',
    label: '一級標題 (H1)',
    shortLabel: 'H1 標題',
    icon: Heading1,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100/90 dark:bg-purple-950/70',
    borderColor: 'border-purple-300 dark:border-purple-500',
    description: '產生 # 標題，適用於章節主標題',
    categoryGroup: 'heading',
    theme: CATEGORY_COLOR_THEMES.purple,
  },
  heading_2: {
    type: 'heading_2',
    label: '二級標題 (H2)',
    shortLabel: 'H2 副標',
    icon: Heading2,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100/90 dark:bg-indigo-950/70',
    borderColor: 'border-indigo-300 dark:border-indigo-500',
    description: '產生 ## 標題，適用於子章節或段落標題',
    categoryGroup: 'heading',
    theme: CATEGORY_COLOR_THEMES.indigo,
  },
  heading_3: {
    type: 'heading_3',
    label: '三級標題 (H3)',
    shortLabel: 'H3 小標',
    icon: Heading3,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100/90 dark:bg-blue-950/70',
    borderColor: 'border-blue-300 dark:border-blue-500',
    description: '產生 ### 標題，適用於小標或清單標題',
    categoryGroup: 'heading',
    theme: CATEGORY_COLOR_THEMES.blue,
  },
  paragraph: {
    type: 'paragraph',
    label: '標準段落 (Paragraph)',
    shortLabel: '正文段落',
    icon: AlignLeft,
    color: 'text-sky-800 dark:text-sky-300',
    bgColor: 'bg-sky-100/90 dark:bg-sky-950/70',
    borderColor: 'border-sky-300 dark:border-sky-500',
    description: '自動修復斷行與排版，輸出標準流暢正文',
    categoryGroup: 'paragraph',
    theme: CATEGORY_COLOR_THEMES.sky,
  },
  table: {
    type: 'table',
    label: '數據表格 (Table)',
    shortLabel: '表格',
    icon: Table,
    color: 'text-emerald-800 dark:text-emerald-300',
    bgColor: 'bg-emerald-100/90 dark:bg-emerald-950/70',
    borderColor: 'border-emerald-300 dark:border-emerald-500',
    description: '轉為 GFM 標準表格 (| 欄位 | 欄位 |)，含表頭對齊',
    categoryGroup: 'table',
    theme: CATEGORY_COLOR_THEMES.emerald,
  },
  code: {
    type: 'code',
    label: '程式碼區塊 (Code)',
    shortLabel: '程式碼',
    icon: Code,
    color: 'text-amber-900 dark:text-amber-300',
    bgColor: 'bg-amber-100/90 dark:bg-amber-950/70',
    borderColor: 'border-amber-300 dark:border-amber-500',
    description: '自動偵測語言，以 ``` 語法標記包裹',
    categoryGroup: 'code',
    theme: CATEGORY_COLOR_THEMES.amber,
  },
  latex_math: {
    type: 'latex_math',
    label: '數學公式 (LaTeX Math)',
    shortLabel: 'LaTeX 公式',
    icon: Sigma,
    color: 'text-rose-800 dark:text-rose-300',
    bgColor: 'bg-rose-100/90 dark:bg-rose-950/70',
    borderColor: 'border-rose-300 dark:border-rose-500',
    description: '轉換為 $$ 獨立公式或 $ 行內公式 LaTeX 語法',
    categoryGroup: 'math',
    theme: CATEGORY_COLOR_THEMES.rose,
  },
  image_caption: {
    type: 'image_caption',
    label: '圖片與圖表 (Image/Chart)',
    shortLabel: '圖片圖表',
    icon: Image,
    color: 'text-pink-800 dark:text-pink-300',
    bgColor: 'bg-pink-100/90 dark:bg-pink-950/70',
    borderColor: 'border-pink-300 dark:border-pink-500',
    description: '擷取影像並自動生成繁中詳細圖說與 Markdown 圖片標籤',
    categoryGroup: 'other',
    theme: CATEGORY_COLOR_THEMES.pink,
  },
  bullet_list: {
    type: 'bullet_list',
    label: '無序清單 (Bullet List)',
    shortLabel: '項目清單',
    icon: List,
    color: 'text-teal-800 dark:text-teal-300',
    bgColor: 'bg-teal-100/90 dark:bg-teal-950/70',
    borderColor: 'border-teal-300 dark:border-teal-500',
    description: '轉為 - 項目符號清單',
    categoryGroup: 'paragraph',
    theme: CATEGORY_COLOR_THEMES.teal,
  },
  numbered_list: {
    type: 'numbered_list',
    label: '有序清單 (Numbered List)',
    shortLabel: '編號清單',
    icon: ListOrdered,
    color: 'text-cyan-800 dark:text-cyan-300',
    bgColor: 'bg-cyan-100/90 dark:bg-cyan-950/70',
    borderColor: 'border-cyan-300 dark:border-cyan-500',
    description: '轉為 1. 2. 3. 循序項目清單',
    categoryGroup: 'paragraph',
    theme: CATEGORY_COLOR_THEMES.cyan,
  },
  quote: {
    type: 'quote',
    label: '引言引用 (Blockquote)',
    shortLabel: '引言',
    icon: Quote,
    color: 'text-violet-800 dark:text-violet-300',
    bgColor: 'bg-violet-100/90 dark:bg-violet-950/70',
    borderColor: 'border-violet-300 dark:border-violet-500',
    description: '轉為 > 引文區塊',
    categoryGroup: 'paragraph',
    theme: CATEGORY_COLOR_THEMES.violet,
  },
  callout_note: {
    type: 'callout_note',
    label: '重點提示 (Callout Note)',
    shortLabel: '提示警示',
    icon: AlertCircle,
    color: 'text-orange-900 dark:text-orange-300',
    bgColor: 'bg-orange-100/90 dark:bg-orange-950/70',
    borderColor: 'border-orange-300 dark:border-orange-500',
    description: '轉為 > [!NOTE] 或 > [!WARNING] 醒目提示框',
    categoryGroup: 'paragraph',
    theme: CATEGORY_COLOR_THEMES.orange,
  },
  auto_detect: {
    type: 'auto_detect',
    label: 'AI 智慧判斷 (Auto)',
    shortLabel: 'AI 智慧',
    icon: Sparkles,
    color: 'text-yellow-900 dark:text-yellow-300',
    bgColor: 'bg-yellow-100/90 dark:bg-yellow-950/70',
    borderColor: 'border-yellow-300 dark:border-yellow-500',
    description: '由 Gemini 自動判斷最佳結構並排版',
    categoryGroup: 'other',
    theme: CATEGORY_COLOR_THEMES.yellow,
  },
  custom: {
    type: 'custom',
    label: '自訂指令 (Custom)',
    shortLabel: '自訂規則',
    icon: Wand2,
    color: 'text-fuchsia-800 dark:text-fuchsia-300',
    bgColor: 'bg-fuchsia-100/90 dark:bg-fuchsia-950/70',
    borderColor: 'border-fuchsia-300 dark:border-fuchsia-500',
    description: '輸入客製化轉換提示詞進行處理',
    categoryGroup: 'other',
    theme: CATEGORY_COLOR_THEMES.fuchsia,
  },
  ignore: {
    type: 'ignore',
    label: '忽略略過 (Ignore)',
    shortLabel: '略過此區',
    icon: Ban,
    color: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-200/90 dark:bg-slate-900/80',
    borderColor: 'border-slate-300 dark:border-slate-600',
    description: '頁首、頁尾、浮水印或頁碼，不包含在輸出中',
    categoryGroup: 'other',
    theme: CATEGORY_COLOR_THEMES.slate,
  },
};

interface Props {
  type: ConversionType;
  showIcon?: boolean;
  short?: boolean;
  className?: string;
  customColor?: string;
}

export const ConversionTypeBadge: React.FC<Props> = ({
  type,
  showIcon = true,
  short = false,
  className = '',
  customColor,
}) => {
  const config = CONVERSION_TYPE_CONFIGS[type] || CONVERSION_TYPE_CONFIGS.paragraph;
  const theme = getObjectTheme({ conversionType: type, customColor });
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} shadow-xs ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot} shrink-0`} />
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{short ? config.shortLabel : config.label}</span>
    </span>
  );
};
