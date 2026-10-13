import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve local pdfjs-dist assets (worker, cmaps, standard fonts) to eliminate external CDN dependency
app.use(
  '/pdfjs-dist',
  express.static(path.resolve(__dirname, 'node_modules/pdfjs-dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: Convert single selected object/region to specified Markdown format
app.post('/api/convert-object', async (req, res) => {
  try {
    const { cropImage, rawText, conversionType, customInstruction } = req.body;

    if (!cropImage && !rawText) {
      return res.status(400).json({ error: 'Missing cropImage or rawText' });
    }

    if (!ai) {
      // Fallback heuristic conversion if API key not available
      let fallbackMd = rawText || '';
      switch (conversionType) {
        case 'heading_1':
          fallbackMd = `# ${fallbackMd.trim()}`;
          break;
        case 'heading_2':
          fallbackMd = `## ${fallbackMd.trim()}`;
          break;
        case 'heading_3':
          fallbackMd = `### ${fallbackMd.trim()}`;
          break;
        case 'table':
          fallbackMd = `| 欄位 1 | 欄位 2 |\n|---|---|\n| ${fallbackMd.split('\n').join(' | ')} |`;
          break;
        case 'code':
          fallbackMd = `\`\`\`text\n${fallbackMd}\n\`\`\``;
          break;
        case 'latex_math':
          fallbackMd = `$$\n${fallbackMd}\n$$`;
          break;
        case 'bullet_list':
          fallbackMd = fallbackMd
            .split('\n')
            .filter((l: string) => l.trim())
            .map((l: string) => `- ${l.trim()}`)
            .join('\n');
          break;
        case 'numbered_list':
          fallbackMd = fallbackMd
            .split('\n')
            .filter((l: string) => l.trim())
            .map((l: string, i: number) => `${i + 1}. ${l.trim()}`)
            .join('\n');
          break;
        case 'quote':
          fallbackMd = `> ${fallbackMd.trim()}`;
          break;
        case 'callout_note':
          fallbackMd = `> [!NOTE]\n> ${fallbackMd.trim()}`;
          break;
        case 'image_caption':
          fallbackMd = `![擷取圖像](${cropImage || ''})\n*圖像說明*`;
          break;
        default:
          fallbackMd = fallbackMd.trim();
      }
      return res.json({ markdown: fallbackMd, isFallback: true });
    }

    const typePrompts: Record<string, string> = {
      heading_1: '將此內容轉換為 Markdown 一級標題（# 標題內容）。僅輸出 Markdown 標題，請去除多餘標號或換行。',
      heading_2: '將此內容轉換為 Markdown 二級標題（## 標題內容）。僅輸出 Markdown 標題。',
      heading_3: '將此內容轉換為 Markdown 三級標題（### 標題內容）。僅輸出 Markdown 標題。',
      paragraph: '將此內容轉換為標準乾淨的 Markdown 段落。嚴格保留原始內容的段落與斷行（該斷行就斷行換行），切勿自行將多行合併成單一行。修正 OCR 拼寫錯誤，排版清晰流暢。',
      table: '將此內容（尤其是表格結構）精確轉換為標準 Markdown 表格（使用 | 列與表頭 --- 分隔）。保留儲存格數值、對齊與標題。如果沒有表頭，請推斷合理的表頭。',
      code: '將此內容轉換為 Markdown 程式碼區塊（使用 ```語法名稱 ... ```）。自動判斷語言（例如 python, json, typescript, bash, sql 等），保留縮排與換行。',
      latex_math: '將此內容中的數學公式轉換為 LaTeX 格式。如果是獨立行公式使用 $$ ... $$，若是行內公式使用 $ ... $。確保數學符號準確無誤。',
      bullet_list: '將此內容轉換為 Markdown 無序列表（使用 - 項目）。自動分層級若有縮排。',
      numbered_list: '將此內容轉換為 Markdown 有序列表（使用 1. 2. 3.）。',
      quote: '將此內容轉換為 Markdown 引用區塊（使用 > 內容）。',
      callout_note: '將此內容轉換為 GitHub 風格的警示/提示區塊（如 > [!NOTE] 或 > [!TIP] 或 > [!WARNING]）。',
      image_caption: '這是一個從 PDF 截取的圖片/圖表/架構圖。請提供此圖片的 Markdown 格式，格式如：![圖表詳細描述](IMAGE_PLACEHOLDER)\n\n*圖表說明：[提供 1-2 句關鍵摘要]*',
      auto_detect: '自動分析此區塊的內容類型（如標題、表格、程式碼、公式、段落、列表、引用或圖表），並以最規範、專業的 Markdown 格式輸出。',
      custom: '請依照使用者指定的轉換要求進行轉換。'
    };

    let baseInstruction = typePrompts[conversionType] || typePrompts.auto_detect;
    if (customInstruction) {
      baseInstruction += `\n額外指定規則：${customInstruction}`;
    }

    const promptText = `你是一個專業的文件與 PDF 轉換為 Markdown 的專家。
請將提供的 PDF 擷取區塊精準轉換為 Markdown。

目標轉換類型指令：
${baseInstruction}

${rawText ? `提取的原始文字內容參考：\n"""\n${rawText}\n"""\n` : ''}

要求：
1. 直接輸出轉換後的 Markdown 文本，不要用額外的三反引號包覆整體回答（除非目標是程式碼區塊），不要輸出「好的，以下是...」之類的客套話。
2. 保留內容完整度，不遺漏資料。繁體中文/英文保持原樣。
3. 嚴格遵守原始內容的排版與段落換行結構，該斷行就斷行，切勿擅自將不同行或多行合併成單一行。
4. 若指定為表格，請嚴格保證 Markdown 表格語法標準完整。
5. 若指定為公式，請嚴格保證 LaTeX 語法正確。
6. 若目標為 image_caption，請在適當位置保留佔位符 IMAGE_PLACEHOLDER。`;

    const parts: any[] = [];

    if (cropImage) {
      const match = cropImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
    });

    let markdown = response.text || '';

    // If conversionType is image_caption and placeholder is present, replace with data URL if desired or handled by client
    if (cropImage && markdown.includes('IMAGE_PLACEHOLDER')) {
      markdown = markdown.replace('IMAGE_PLACEHOLDER', cropImage);
    }

    res.json({
      markdown,
      detectedType: conversionType === 'auto_detect' ? 'auto' : conversionType,
    });
  } catch (error: any) {
    console.error('Error in /api/convert-object:', error);
    res.status(500).json({ error: error?.message || 'Conversion failed' });
  }
});

// Endpoint: AI auto-detect structural objects & bounding boxes across the page
app.post('/api/detect-page-objects', async (req, res) => {
  try {
    const { pageImage, textItems, pageWidth, pageHeight } = req.body;

    if (!pageImage && (!textItems || textItems.length === 0)) {
      return res.status(400).json({ error: 'Missing pageImage or textItems' });
    }

    if (!ai) {
      // Heuristic fallback if no API key
      const fallbackObjects: any[] = [];
      if (Array.isArray(textItems)) {
        // Group nearby text items into simple blocks
        textItems.slice(0, 15).forEach((item: any, idx: number) => {
          fallbackObjects.push({
            id: `block-${idx}-${Date.now()}`,
            type: item.height > 18 ? 'heading_1' : 'paragraph',
            label: item.text?.slice(0, 30) || `區塊 ${idx + 1}`,
            box: {
              x: Math.max(0, item.x || 20),
              y: Math.max(0, item.y || idx * 40),
              width: item.width || 200,
              height: item.height || 30,
            },
            confidence: 0.8,
          });
        });
      }
      return res.json({ objects: fallbackObjects, isFallback: true });
    }

    const systemPrompt = `你是一個專業的文件版面分析與物件偵測系統 (Layout Analysis & Object Detection)。
分析傳入的 PDF 頁面圖片與文字座標，識別出頁面上的結構性物件，並劃定各自的外框 (Bounding Box) 以及建議的 Markdown 轉換類型。

支援的物件類型 (type)：
- "heading_1": 一級大標題
- "heading_2": 二級副標題
- "heading_3": 三級小標題
- "paragraph": 普通內文段落
- "table": 表格區域
- "code": 程式碼區塊
- "latex_math": 數學公式 / 方程式
- "image_caption": 圖片 / 流程圖 / 照片 / 統計圖表
- "bullet_list": 項目符號清單
- "numbered_list": 編號清單
- "quote": 引言或引用
- "callout_note": 提示框 / 警告框 / 重點標註

頁面寬度: ${pageWidth || 600}，頁面高度: ${pageHeight || 800}。
回傳的座標 box 請以像素 (Pixel) 座標提供：
- x: 左上角 X (0 到 寬度)
- y: 左上角 Y (0 到 高度)
- width: 寬度
- height: 高度

請按照由上到下、由左到右的標準閱讀順序排序輸出物件。
避免過度破碎化，相鄰且屬於同一個段落或同一張表格的內容應合成一個物件。`;

    const parts: any[] = [];
    if (pageImage) {
      const match = pageImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({
      text: `請分析此頁面並回傳物件清單 JSON。如果偵測到表格或圖片，務必將其完整外框納入。
${textItems && textItems.length > 0 ? `頁面提取文字節錄參考：${JSON.stringify(textItems.slice(0, 30))}` : ''}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: '物件類型，例如 heading_1, heading_2, paragraph, table, code, latex_math, image_caption, bullet_list, numbered_list, quote, callout_note',
                  },
                  label: {
                    type: Type.STRING,
                    description: '簡短摘要或標籤說明，如「摘要段落」、「數據對比表格」',
                  },
                  box: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                      height: { type: Type.NUMBER },
                    },
                    required: ['x', 'y', 'width', 'height'],
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: '置信度 0.0 到 1.0',
                  },
                },
                required: ['type', 'label', 'box'],
              },
            },
          },
          required: ['objects'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"objects":[]}');
    const objects = (parsed.objects || []).map((obj: any, idx: number) => ({
      ...obj,
      id: `ai-detect-${Date.now()}-${idx}`,
    }));

    res.json({ objects });
  } catch (error: any) {
    console.error('Error in /api/detect-page-objects:', error);
    res.status(500).json({ error: error?.message || 'Object detection failed' });
  }
});

// Endpoint: Batch convert full document / page
app.post('/api/convert-page-full', async (req, res) => {
  try {
    const { pageImage, rules } = req.body;
    if (!pageImage) {
      return res.status(400).json({ error: 'Missing pageImage' });
    }

    if (!ai) {
      return res.json({ markdown: '# 示範 Markdown 文件\n\n頁面轉換完成（無 API Key 模式）。', isFallback: true });
    }

    const parts: any[] = [];
    const match = pageImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }

    const promptText = `請將此 PDF 頁面圖片完整且專業地轉換為乾淨、排版優良的 Markdown 格式。
要求：
1. 標題請依層級標註為 #, ##, ### 等。
2. 若有表格，請精準還原為標準 Markdown 表格語法（包含完整欄位與表頭）。
3. 若有程式碼，請使用 \`\`\` 包裹並標示程式語言。
4. 若有數學公式，請使用 LaTeX 語法 ($ 或 $$)。
5. 若有列表，請使用 - 或 1. 列表語法。
6. 保留所有文字與數字內容，不得臆造或隨意省略。繁體中文/英文保持原樣。
7. 嚴格遵守原始內容的段落與斷行結構，該斷行就斷行，切勿擅自將多行內容合併成單一行。
8. 直接輸出 Markdown 內容，不要包含額外的問候語或包裹反引號。
${rules ? `自訂全域規則：${rules}` : ''}`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
    });

    res.json({ markdown: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/convert-page-full:', error);
    res.status(500).json({ error: error?.message || 'Page conversion failed' });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
