// PDF parser for "Cuentas por Cobrar por Cliente y Factura" reports
// Uses pdfjs-dist to extract text, then pattern-matches client headers + invoice rows.

import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface Invoice {
  doc: string;
  fecha: string; // dd/mm/yyyy
  fechaISO: string; // yyyy-mm-dd for filtering
  concepto: string;
  diasVencido: number;
  monto: number;
}

export interface ClientCartera {
  id: string;
  nombre: string;
  telefonoPDF?: string;
  diasConfig?: number; // "Días" field from header
  invoices: Invoice[];
  total: number;
}

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const NUM_RE = /^-?[\d,]+\.\d{2}$/;
const INT_RE = /^\d{1,6}$/;
// Combined "DOC FECHA" cell, e.g. "11601 15/04/2015"
const DOC_DATE_RE = /^(\d{1,7})\s+(\d{2}\/\d{2}\/\d{4})$/;

function toISO(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
function parseMoney(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/**
 * Extract text items grouped by line (y position) per page, sorted by x.
 */
async function extractLines(file: ArrayBuffer): Promise<string[][]> {
  const pdf = await pdfjsLib.getDocument({ data: file }).promise;
  const allLines: string[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lineMap = new Map<number, { x: number; str: string }[]>();
    for (const it of content.items as Array<{
      str: string;
      transform: number[];
    }>) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      // bucket nearby y values together
      let key = y;
      for (const k of lineMap.keys()) {
        if (Math.abs(k - y) <= 2) {
          key = k;
          break;
        }
      }
      const arr = lineMap.get(key) ?? [];
      arr.push({ x, str: it.str });
      lineMap.set(key, arr);
    }
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a); // top to bottom
    for (const y of sortedYs) {
      const cells = lineMap
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((c) => c.str.trim())
        .filter(Boolean);
      if (cells.length) allLines.push(cells);
    }
  }
  return allLines;
}

export async function parseCarteraPDF(file: File): Promise<ClientCartera[]> {
  const buf = await file.arrayBuffer();
  const lines = await extractLines(buf);

  const clients = new Map<string, ClientCartera>();
  let current: ClientCartera | null = null;

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i];
    const joined = cells.join(" ");

    // Skip page chrome / report headers
    if (
      /^(Página|Hora|Fecha:|Encargado|REMEDIO|Cuentas por Cobrar|Moneda Nacional|V\b|Días de|Cliente\s+Doc)/i.test(
        joined,
      ) ||
      /Elaborado con/i.test(joined) ||
      /^Total/i.test(cells[0] ?? "") ||
      cells.every((c) => /^[A-Z]$/.test(c)) // "V E N C I D O" header
    ) {
      continue;
    }

    // Client header: ["9","RIVERA MAYAN", ("Encargado")? ...]
    if (
      cells.length >= 2 &&
      /^\d{1,6}$/.test(cells[0]) &&
      /^[A-ZÁÉÍÓÚÑ&.,/\- 0-9]{2,}$/.test(cells[1]) &&
      !DATE_RE.test(cells[1]) &&
      !DOC_DATE_RE.test(cells[1])
    ) {
      const id = cells[0];
      // Take cells[1] as the canonical name (everything after — like "Encargado" — is noise)
      const nombre = cells[1].trim();
      current = clients.get(id) ?? {
        id,
        nombre,
        invoices: [],
        total: 0,
      };
      clients.set(id, current);
      continue;
    }

    // "Lím. Cred. ... Tels. xxxx ... Días N" line
    if (current && /Tels\.?/i.test(joined)) {
      const telIdx = cells.findIndex((c) => /^Tels/i.test(c));
      if (telIdx >= 0 && cells[telIdx + 1]) current.telefonoPDF = cells[telIdx + 1];
      const diasIdx = cells.findIndex((c) => /^D[ií]as$/i.test(c));
      if (diasIdx >= 0 && cells[diasIdx + 1] && /^\d+$/.test(cells[diasIdx + 1])) {
        current.diasConfig = parseInt(cells[diasIdx + 1], 10);
      }
      continue;
    }

    if (!current) continue;

    // Invoice row. Doc + Fecha may be in ONE cell ("11601 15/04/2015") or two.
    // Some rows have a leading "F" cell (foreign-currency marker) that we skip.
    let docNo = "";
    let fecha = "";
    let conceptoIdx = -1;

    for (let j = 0; j < cells.length; j++) {
      const m = DOC_DATE_RE.exec(cells[j]);
      if (m) {
        docNo = m[1];
        fecha = m[2];
        break;
      }
      // Two-cell variant: INT then DATE
      if (INT_RE.test(cells[j]) && DATE_RE.test(cells[j + 1] ?? "")) {
        docNo = cells[j];
        fecha = cells[j + 1];
        break;
      }
    }
    if (!docNo || !fecha) continue;

    conceptoIdx = cells.findIndex((c) =>
      /^(Factura|Nota|Anticipo|Cargo|Devoluci|Cheque)/i.test(c),
    );
    if (conceptoIdx === -1) continue;

    // Only invoices count for cobranza
    if (!/^Factura/i.test(cells[conceptoIdx])) continue;

    // Días vencido: integer after concepto, before money
    let dias = 0;
    for (let j = conceptoIdx + 1; j < cells.length; j++) {
      if (/^\d{1,5}$/.test(cells[j])) {
        dias = parseInt(cells[j], 10);
        break;
      }
    }

    // Monto: last money-formatted cell
    let monto = 0;
    for (let j = cells.length - 1; j >= 0; j--) {
      if (NUM_RE.test(cells[j])) {
        monto = parseMoney(cells[j]);
        break;
      }
    }
    if (monto <= 0) continue;

    current.invoices.push({
      doc: docNo,
      fecha,
      fechaISO: toISO(fecha),
      concepto: cells[conceptoIdx],
      diasVencido: dias,
      monto,
    });
    current.total += monto;
  }

  // Drop clients with no invoices
  return Array.from(clients.values()).filter((c) => c.invoices.length > 0);
}
