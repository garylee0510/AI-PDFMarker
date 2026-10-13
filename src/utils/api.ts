import { ConversionType } from '../types';

export interface ConvertObjectPayload {
  cropImage?: string;
  rawText?: string;
  conversionType: ConversionType;
  customInstruction?: string;
}

export async function convertObjectApi(payload: ConvertObjectPayload): Promise<{
  markdown: string;
  detectedType?: string;
}> {
  const res = await fetch('/api/convert-object', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Conversion failed (${res.status})`);
  }

  return await res.json();
}

export interface DetectObjectsPayload {
  pageImage?: string;
  textItems?: Array<{ text: string; x: number; y: number; width: number; height: number }>;
  pageWidth: number;
  pageHeight: number;
}

export async function detectPageObjectsApi(payload: DetectObjectsPayload): Promise<{
  objects: Array<{
    id: string;
    type: ConversionType;
    label: string;
    box: { x: number; y: number; width: number; height: number };
    confidence?: number;
  }>;
}> {
  const res = await fetch('/api/detect-page-objects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Object detection failed (${res.status})`);
  }

  return await res.json();
}

export async function convertFullPageApi(pageImage: string, rules?: string): Promise<{
  markdown: string;
}> {
  const res = await fetch('/api/convert-page-full', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageImage, rules }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Full page conversion failed (${res.status})`);
  }

  return await res.json();
}
