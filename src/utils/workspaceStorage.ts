import { WorkspaceProjectData, PDFObjectItem } from '../types';

const AUTOSAVE_STORAGE_KEY = 'pdf_markdown_autosave_project';

/**
 * Convert Uint8Array to base64 string safely without stack overflow
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Trigger download of workspace project file (.pdfmd)
 */
export function saveWorkspaceToFile(projectData: WorkspaceProjectData): void {
  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const cleanName = projectData.fileName
    ? projectData.fileName.replace(/\.pdf$/i, '')
    : 'project';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanName}-workspace.pdfmd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate workspace project data from JSON text
 */
export function parseWorkspaceFile(content: string): WorkspaceProjectData {
  try {
    const data = JSON.parse(content);
    if (!data.pdfBase64) {
      throw new Error('工作檔格式不完整：缺少 PDF 檔案數據');
    }
    if (!data.allPagesObjects || typeof data.allPagesObjects !== 'object') {
      throw new Error('工作檔格式不完整：缺少物件標註資訊');
    }
    return data as WorkspaceProjectData;
  } catch (err: any) {
    throw new Error(`無法讀取工作檔：${err?.message || '無效的 JSON 檔案'}`);
  }
}

/**
 * Save draft to browser local storage
 */
export function saveAutosaveDraft(projectData: WorkspaceProjectData): void {
  try {
    // Only save if total data isn't exceeding typical localStorage 5MB limit
    const jsonString = JSON.stringify(projectData);
    if (jsonString.length < 4.5 * 1024 * 1024) {
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, jsonString);
    }
  } catch (err) {
    // LocalStorage quota might be exceeded for very large PDFs, safely ignore
    console.warn('Auto-save to localStorage omitted:', err);
  }
}

/**
 * Retrieve autosave draft from local storage
 */
export function getAutosaveDraft(): WorkspaceProjectData | null {
  try {
    const item = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch (err) {
    return null;
  }
}
