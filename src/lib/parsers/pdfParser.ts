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
const INT_RE = /^\d{1,5}$/;

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

    // Skip headers / page chrome
    if (
      /^(Cliente|Doc|Fecha|Concepto|Tipo|Página|Hora|Total|Encargado|REMEDIO|Cuentas por Cobrar)/i.test(
        joined
      ) ||
      /Elaborado con/i.test(joined)
    ) {
      continue;
    }

    // Client header: starts with integer ID followed by uppercase NAME
    // e.g. ["9", "RIVERA MAYAN"] or ["13", "TAAJ MA ALOB"]
    if (
      cells.length >= 2 &&
      /^\d{1,6}$/.test(cells[0]) &&
      /^[A-ZÁÉÍÓÚÑ&.,\- ]{2,}$/.test(cells[1]) &&
      // Must NOT look like an invoice row (no date in cells[2])
      !DATE_RE.test(cells[2] ?? "")
    ) {
      const id = cells[0];
      const nombre = cells.slice(1).filter((c) => /^[A-ZÁÉÍÓÚÑ&.,\- ]+$/.test(c)).join(" ").trim();
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

    // Invoice row: doc, date, "Factura"|"Anticipo"|..., (tipo), días, ..., monto
    // Find a date cell + a "Factura" cell
    if (!current) continue;
    const dateIdx = cells.findIndex((c) => DATE_RE.test(c));
    const conceptoIdx = cells.findIndex((c) => /^(Factura|Nota|Anticipo|Cargo|Devoluci)/i.test(c));
    if (dateIdx === -1 || conceptoIdx === -1) continue;

    // Doc # is usually right before the date
    const docCandidate = cells[dateIdx - 1];
    if (!docCandidate || !INT_RE.test(docCandidate)) continue;

    // Días vencido: integer between concepto and the money column
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

    // Only invoices (Factura), skip Anticipo/Devolución for cobranza
    if (!/^Factura/i.test(cells[conceptoIdx])) continue;
    if (monto <= 0) continue;

    const fecha = cells[dateIdx];
    current.invoices.push({
      doc: docCandidate,
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
