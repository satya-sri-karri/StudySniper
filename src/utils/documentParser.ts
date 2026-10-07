import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure pdfjs worker fallback to cdnjs
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

async function parsePPTXFile(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const slideFiles: { name: string; num: number }[] = [];

  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
    }
  });

  slideFiles.sort((a, b) => a.num - b.num);

  if (slideFiles.length === 0) {
    return '';
  }

  let extractedText = '';

  for (const slide of slideFiles) {
    const xmlContent = await zip.file(slide.name)?.async('text');
    if (xmlContent) {
      // Extract all text content enclosed inside XML tags like <a:t>...</a:t>
      const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const slideText = textMatches
        .map(m => m.replace(/<\/?[^>]+(>|$)/g, '').trim())
        .filter(Boolean)
        .join(' ');

      if (slideText) {
        extractedText += `[Slide ${slide.num}]\n${slideText}\n\n`;
      }
    }
  }

  return extractedText.trim();
}

export async function parseDocumentFile(file: File): Promise<{
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent: string;
}> {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'TXT';
  const size = file.size;

  try {
    // 1. PPTX Parsing using JSZip
    if (ext === 'PPTX' || ext === 'PPT') {
      try {
        const pptxText = await parsePPTXFile(file);
        if (pptxText.length > 10) {
          return { fileName: file.name, fileType: ext, fileSize: size, textContent: pptxText };
        }
      } catch (pptxErr) {
        console.warn('PPTX zip parsing failed, trying string fallback:', pptxErr);
      }
    }

    // 2. PDF Parsing using pdfjs-dist
    if (ext === 'PDF') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        const numPages = Math.min(pdf.numPages, 100);

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(' ');
          if (pageText.trim()) {
            fullText += `[Page ${i}]\n${pageText}\n\n`;
          }
        }

        const extracted = fullText.trim();
        if (extracted.length > 20) {
          return { fileName: file.name, fileType: ext, fileSize: size, textContent: extracted };
        }
      } catch (pdfErr) {
        console.warn('PDFjs parsing failed, using fallback ascii extraction:', pdfErr);
      }
    }

    // 3. DOCX Parsing using mammoth
    if (ext === 'DOCX' || ext === 'DOC') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extracted = result.value.trim();
        if (extracted.length > 10) {
          return { fileName: file.name, fileType: ext, fileSize: size, textContent: extracted };
        }
      } catch (docxErr) {
        console.warn('Mammoth docx parsing failed:', docxErr);
      }
    }

    // 4. Plain Text / Markdown / Code / Data files
    const textTypes = ['TXT', 'MD', 'CSV', 'JSON', 'JS', 'TS', 'PY', 'JAVA', 'C', 'CPP', 'HTML', 'CSS', 'LOG', 'SRT', 'RST', 'XML', 'YAML', 'YML'];
    if (textTypes.includes(ext) || file.type.startsWith('text/')) {
      const text = await file.text();
      if (text.trim()) {
        return { fileName: file.name, fileType: ext, fileSize: size, textContent: text.trim() };
      }
    }

    // 5. Binary/PPT fallback - string extraction
    const rawText = await file.text().catch(() => '');
    const cleanAscii = rawText.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    const printableWords = cleanAscii.split(' ').filter(w => w.length > 2 && w.length < 30);

    if (printableWords.length > 20) {
      const recoveredText = printableWords.join(' ');
      return { fileName: file.name, fileType: ext, fileSize: size, textContent: recoveredText.slice(0, 15000) };
    }

    return {
      fileName: file.name,
      fileType: ext,
      fileSize: size,
      textContent: `Document: ${file.name}\nType: ${ext}\nSize: ${(size / 1024).toFixed(1)} KB\n\nContent indexed. Ask Sniper AI any questions or generate flashcards & quizzes from ${file.name}.`
    };
  } catch (err) {
    console.error('Document parsing error:', err);
    return {
      fileName: file.name,
      fileType: ext,
      fileSize: size,
      textContent: `Document: ${file.name}\nType: ${ext}\nSize: ${(size / 1024).toFixed(1)} KB\n\nDocument indexed for Q&A.`
    };
  }
}
