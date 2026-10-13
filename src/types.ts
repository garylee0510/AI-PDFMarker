export type ConversionType =
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'paragraph'
  | 'table'
  | 'code'
  | 'latex_math'
  | 'image_caption'
  | 'bullet_list'
  | 'numbered_list'
  | 'quote'
  | 'callout_note'
  | 'auto_detect'
  | 'custom'
  | 'ignore';

export type ViewLayout =
  | 'pdf'
  | 'split'
  | 'markdown_preview'
  | 'markdown_split'
  | 'markdown_raw';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface BoundingBox {
  x: number; // in pixels relative to unscaled canvas
  y: number;
  width: number;
  height: number;
}

export interface PDFObjectItem {
  id: string;
  pageNumber: number;
  box: BoundingBox;
  conversionType: ConversionType;
  customColor?: string; // Optional custom color mark override (e.g. 'purple', 'emerald', 'rose', 'amber')
  customInstruction?: string;
  codeLanguage?: string;
  rawText?: string;
  cropImageDataUrl?: string;
  markdownResult?: string;
  isConverting?: boolean;
  error?: string;
  confidence?: number;
  label?: string;
  isLocked?: boolean; // When true, prohibits moving and resizing
}

export interface ExtractedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFDocumentState {
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
  zoom: number; // 1 = 100%
  pdfVersion?: string; // e.g. 'PDF 1.4', 'PDF 1.3'
  pageObjects: Record<number, PDFObjectItem[]>; // keyed by pageNumber
}

export interface WorkspaceProjectData {
  format: 'pdfmd_workspace';
  version: 1;
  savedAt: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
  zoom?: number;
  pdfVersion?: string; // Detected or loaded PDF version, e.g. 'PDF 1.3', 'PDF 1.4'
  pdfBase64: string; // base64 string of the original PDF binary
  allPagesObjects: Record<number, PDFObjectItem[]>;
  fullPageMarkdown?: string;
}

