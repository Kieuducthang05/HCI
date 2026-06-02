import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "fs";

export type PdfLine = {
  text: string;
  fontSize?: number;
  gapAfter?: number;
};

function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function createSimplePdf(lines: PdfLine[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fontBytes: Buffer;
  try {
    fontBytes = readFileSync("/usr/share/fonts/noto/NotoSans-Regular.ttf");
  } catch (e) {
    try {
      fontBytes = readFileSync("/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf");
    } catch (e2) {
      try {
        fontBytes = readFileSync("/usr/share/fonts/liberation/LiberationSans-Regular.ttf");
      } catch (e3) {
        fontBytes = readFileSync("/usr/share/fonts/TTF/DejaVuSans.ttf");
      }
    }
  }

  const customFont = await pdfDoc.embedFont(fontBytes);

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN_X = 48;
  const MARGIN_TOP = 52;
  const MARGIN_BOTTOM = 52;
  const DEFAULT_FONT_SIZE = 10;
  const MAX_CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  for (const line of lines) {
    const fontSize = line.fontSize ?? DEFAULT_FONT_SIZE;
    const gapAfter = line.gapAfter ?? 0;
    const textHeight = fontSize * 1.35; // Standard line height ratio

    // Wrap the text dynamically based on actual width
    const wrappedLines = wrapText(line.text, MAX_CONTENT_WIDTH, fontSize, customFont);

    for (const wrappedLine of wrappedLines) {
      // Check if we need to advance to a new page
      if (cursorY - textHeight < MARGIN_BOTTOM) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursorY = PAGE_HEIGHT - MARGIN_TOP;
      }

      // Draw the line of text
      page.drawText(wrappedLine, {
        x: MARGIN_X,
        y: cursorY - fontSize,
        size: fontSize,
        font: customFont,
        color: rgb(0.12, 0.14, 0.17), // Dark grey
      });

      cursorY -= textHeight;
    }

    cursorY -= gapAfter;
  }

  return await pdfDoc.save();
}
