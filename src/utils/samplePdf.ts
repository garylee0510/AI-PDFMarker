export interface PdfVersionInfo {
  version: string; // e.g. '1.3', '1.4', '1.5', '1.6', '1.7', '2.0'
  label: string; // e.g. 'PDF 1.4'
  specification: string;
  features: string;
  year: number;
}

export const SUPPORTED_PDF_VERSIONS: PdfVersionInfo[] = [
  {
    version: '1.3',
    label: 'PDF 1.3',
    specification: 'Adobe Acrobat 4.0 (經典相容版)',
    features: '早期經典向量與純文字標準格式，相容性最廣，不含透明度圖層',
    year: 1999,
  },
  {
    version: '1.4',
    label: 'PDF 1.4',
    specification: 'Adobe Acrobat 5.0 (標準預設)',
    features: '引入透明度 (Transparency)、JBIG2、128-bit 安全機制，目前最普遍主流格式',
    year: 2001,
  },
  {
    version: '1.5',
    label: 'PDF 1.5',
    specification: 'Adobe Acrobat 6.0',
    features: '支援物件流壓縮 (ObjStm)、JPEG 2000 影像編碼與層級管理',
    year: 2003,
  },
  {
    version: '1.6',
    label: 'PDF 1.6',
    specification: 'Adobe Acrobat 7.0',
    features: '引入 3D 繪圖嵌入、AES 加密與 OpenType 字型標準支援',
    year: 2004,
  },
  {
    version: '1.7',
    label: 'PDF 1.7',
    specification: 'ISO 32000-1 (國際標準)',
    features: '首個 ISO 國際標準化規格，具備全面跨平台相容性與現代文件結構',
    year: 2008,
  },
  {
    version: '2.0',
    label: 'PDF 2.0',
    specification: 'ISO 32000-2 (次世代標準)',
    features: 'ISO 32000-2 次世代規範，支援最新色彩管理、UTF-8 註釋與現代安全標準',
    year: 2017,
  },
];

export interface SampleOutlineItem {
  title: string;
  pageIndex: number;
}

function createPdfBinary(
  pages: Array<{ lines: string[] }>,
  version: string = '1.4',
  outlines?: SampleOutlineItem[]
): Uint8Array {
  // Clean version string (e.g. 'PDF 1.3' -> '1.3')
  const cleanVersion = version.replace(/^PDF\s*/i, '').trim() || '1.4';
  const objects: string[] = [];
  const xref: number[] = [];
  let byteOffset = 0;

  function addObject(content: string) {
    const objNum = objects.length + 1;
    xref.push(byteOffset);
    const objStr = `${objNum} 0 obj\n${content}\nendobj\n`;
    objects.push(objStr);
    byteOffset += new TextEncoder().encode(objStr).length;
    return objNum;
  }

  const header = `%PDF-${cleanVersion}\n`;
  byteOffset += new TextEncoder().encode(header).length;

  // Obj 1: Catalog (will fill later)
  const catalogPlaceholder = '<< /Type /Catalog /Pages 2 0 R >>';
  addObject(catalogPlaceholder);

  // Obj 2: Pages
  const pagesPlaceholder = `<< /Type /Pages /Kids [PAGE_KIDS] /Count ${pages.length} >>`;
  addObject(pagesPlaceholder);

  // Obj 3: Font
  const fontObj = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  addObject(fontObj);

  // Now create page objects and stream objects
  const kids: string[] = [];
  const pageObjNums: number[] = [];

  pages.forEach((pageData) => {
    let currentY = 780;
    
    // Convert lines into PDF text operators
    const textOps: string[] = ['BT', '/F1 12 Tf'];
    pageData.lines.forEach((line) => {
      // Escape parentheses
      const safeLine = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      textOps.push(`50 ${currentY} Td`);
      textOps.push(`(${safeLine}) Tj`);
      textOps.push(`-50 -${currentY} Td`); // reset
      currentY -= 20;
    });
    textOps.push('ET');

    const streamBody = textOps.join('\n');
    const streamLen = new TextEncoder().encode(streamBody).length;
    const streamObj = `<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream`;
    
    // We add content obj first, then page obj
    const contentObjNum = objects.length + 1;
    addObject(streamObj);

    const pageObjNum = objects.length + 1;
    pageObjNums.push(pageObjNum);
    kids.push(`${pageObjNum} 0 R`);
    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;
    addObject(pageObj);
  });

  // Re-encode Pages object with actual kids
  const finalPagesObj = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  objects[1] = `2 0 obj\n${finalPagesObj}\nendobj\n`;

  // Create native PDF Outlines if provided
  let outlinesRootNum = 0;
  if (outlines && outlines.length > 0) {
    outlinesRootNum = objects.length + 1;
    const firstItemNum = outlinesRootNum + 1;
    const lastItemNum = outlinesRootNum + outlines.length;

    // Outlines root dictionary
    const rootObjStr = `<< /Type /Outlines /First ${firstItemNum} 0 R /Last ${lastItemNum} 0 R /Count ${outlines.length} >>`;
    addObject(rootObjStr);

    // Add outline item objects
    for (let i = 0; i < outlines.length; i++) {
      const item = outlines[i];
      const targetPageNum = pageObjNums[Math.min(item.pageIndex, pageObjNums.length - 1)] || pageObjNums[0];
      const safeTitle = item.title.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      
      const prevField = i > 0 ? `/Prev ${firstItemNum + i - 1} 0 R` : '';
      const nextField = i < outlines.length - 1 ? `/Next ${firstItemNum + i + 1} 0 R` : '';
      
      const itemObjStr = `<< /Title (${safeTitle}) /Parent ${outlinesRootNum} 0 R ${prevField} ${nextField} /Dest [${targetPageNum} 0 R /XYZ 0 842 0] >>`.replace(/\s+/g, ' ');
      addObject(itemObjStr);
    }

    // Update Catalog to reference /Outlines
    const catalogObj = `<< /Type /Catalog /Pages 2 0 R /Outlines ${outlinesRootNum} 0 R >>`;
    objects[0] = `1 0 obj\n${catalogObj}\nendobj\n`;
  }

  // Recalculate xref accurately
  let fullDoc = header;
  const accurateXref: number[] = [0];
  let currentOffset = new TextEncoder().encode(header).length;

  for (let i = 0; i < objects.length; i++) {
    accurateXref.push(currentOffset);
    fullDoc += objects[i];
    currentOffset += new TextEncoder().encode(objects[i]).length;
  }

  const xrefOffset = currentOffset;
  let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(accurateXref[i]).padStart(10, '0');
    xrefTable += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fullDoc += xrefTable + trailer;

  return new TextEncoder().encode(fullDoc);
}

export function generateResearchPaperSample(version: string = '1.4'): Uint8Array {
  return createPdfBinary(
    [
      {
        lines: [
          'Multi-Modal Document Parsing with Intelligent Object Segmentations',
          'Dr. Alexander Vance, AI Systems Laboratory, Stanford & Berkeley Joint Project',
          'Date: 2025-05-18 | Category: Computer Vision & Natural Language Processing',
          '',
          '1. ABSTRACT',
          'Modern document parsing requires selective transformation of diverse entities,',
          'such as dense mathematical formulations, tabular records, multi-column blocks,',
          'and code snippets into unified Markdown documentation.',
          '',
          '2. MATHEMATICAL FORMULATION',
          'Loss function for cross-modal bounding box alignment is formulated as:',
          'L(theta) = alpha * CrossEntropy(y, y_hat) + beta * SmoothL1(b - b_hat)',
          'Where theta denotes the model parameters and alpha, beta are balancing weights.',
          '',
          '3. EXPERIMENTAL COMPARISON TABLE',
          'Model Name      | Precision (%) | Recall (%) | F1-Score | Latency (ms)',
          'DocLayout-V1    | 89.4          | 87.2       | 88.3     | 45.2',
          'Gemini-Flash-3.8| 98.7          | 97.9       | 98.3     | 18.4',
          'Legacy OCR Tool | 74.1          | 71.5       | 72.8     | 120.0',
          '',
          '4. IMPLEMENTATION SNIPPET (PYTHON)',
          'def extract_markdown(region_crop, target_type):',
          '    response = gemini_client.models.generate_content(',
          '        model="gemini-3.8-flash", contents=[region_crop, target_type]',
          '    )',
          '    return response.text',
          '',
          '5. CONCLUSION',
          'Fine-grained user bounding-box annotation provides 3x higher extraction accuracy',
          'compared to monolithic blind full-page OCR conversions.',
        ],
      },
      {
        lines: [
          'Multi-Modal Document Parsing - Appendix & Deployment Guidelines',
          '',
          '6. SYSTEM ARCHITECTURE SPECIFICATION',
          '- Client: High-precision Canvas viewport with multi-touch / mouse drag handles',
          '- Server: Node.js Express backend with streaming GenAI SDK execution',
          '- Formats Supported: GFM Tables, LaTeX math ($$...$$), Syntax codeblocks',
          '',
          '7. PERFORMANCE BENCHMARKS ACROSS PAGE SIZES',
          'Page Type    | Objects Detected | Conversion Time | Token Efficiency',
          'A4 Standard  | 14 items         | 1.2s            | 99.2%',
          'US Letter    | 12 items         | 1.1s            | 99.5%',
          'Two-Column   | 22 items         | 1.8s            | 98.1%',
          '',
          '8. ACKNOWLEDGEMENTS',
          'Special thanks to the Google AI Studio developer ecosystem for high-speed inference.',
        ],
      },
    ],
    version,
    [
      { title: '1. ABSTRACT', pageIndex: 0 },
      { title: '2. MATHEMATICAL FORMULATION', pageIndex: 0 },
      { title: '3. EXPERIMENTAL COMPARISON TABLE', pageIndex: 0 },
      { title: '4. IMPLEMENTATION SNIPPET (PYTHON)', pageIndex: 0 },
      { title: '5. CONCLUSION', pageIndex: 0 },
      { title: '6. SYSTEM ARCHITECTURE SPECIFICATION', pageIndex: 1 },
      { title: '7. PERFORMANCE BENCHMARKS ACROSS PAGE SIZES', pageIndex: 1 },
      { title: '8. ACKNOWLEDGEMENTS', pageIndex: 1 },
    ]
  );
}

export function generateInvoiceReportSample(version: string = '1.4'): Uint8Array {
  return createPdfBinary(
    [
      {
        lines: [
          'INVOICE & FINANCIAL REPORT - Q3 2025',
          'Company: CloudTech Innovations Inc.',
          'Invoice Number: INV-2025-09842 | Billing Date: 2025-09-30',
          'Customer: Apex Digital Solutions Ltd. (Tax ID: 88392019)',
          '',
          'EXECUTIVE SUMMARY',
          'This statement outlines the cloud infrastructure usage and enterprise licensing fees.',
          'Payment terms: Net 30 days via direct wire transfer.',
          '',
          'BILLING BREAKDOWN (TABLE)',
          'Item Description       | Quantity | Unit Price ($) | Total Amount ($)',
          'AI Studio Engine Pro  | 5 seats  | 200.00         | 1,000.00',
          'Serverless OCR Cluster | 120 hrs  | 15.50          | 1,860.00',
          'High-Res Storage 2TB   | 3 mos    | 85.00          | 255.00',
          'Custom Fine-Tuning Run | 2 runs   | 450.00         | 900.00',
          'Subtotal: $4,015.00    | Tax (5%): $200.75         | Grand Total: $4,215.75',
          '',
          'PAYMENT INSTRUCTIONS & POLICIES',
          '> Important Notice: Please quote INV-2025-09842 in your bank transfer memo.',
          '> For accounting inquiries, contact billing@cloudtech-innovations.io.',
        ],
      },
    ],
    version,
    [
      { title: 'INVOICE & FINANCIAL REPORT - Q3 2025', pageIndex: 0 },
      { title: 'EXECUTIVE SUMMARY', pageIndex: 0 },
      { title: 'BILLING BREAKDOWN (TABLE)', pageIndex: 0 },
      { title: 'PAYMENT INSTRUCTIONS & POLICIES', pageIndex: 0 },
    ]
  );
}
