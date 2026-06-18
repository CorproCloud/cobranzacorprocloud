import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/assets/logo.png";
import { formatCurrency } from "@/lib/messaging";
import type { ClientCartera, Invoice } from "@/lib/parsers/pdfParser";
import type { Contact } from "@/lib/parsers/excelParser";

const COMPANY = "REMEDIO PARA EL MAL DE AMORES";

export interface ReportRow {
  client: ClientCartera;
  contact?: Contact;
  filteredInvoices: Invoice[];
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(logo);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Genera un PDF con una hoja por cliente, desglosando sus facturas.
 * Respeta el orden y filtros aplicados (rows ya viene ordenado/filtrado).
 */
export async function generateClientsPdf(rows: ReportRow[]): Promise<void> {
  const visible = rows.filter((r) => r.filteredInvoices.length > 0);
  if (visible.length === 0) {
    throw new Error("No hay clientes con facturas para exportar");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const logoData = await loadLogo();
  const fecha = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const primary: [number, number, number] = [37, 99, 235];
  const dark: [number, number, number] = [30, 41, 59];
  const muted: [number, number, number] = [100, 116, 139];

  visible.forEach((row, idx) => {
    if (idx > 0) doc.addPage();

    // ---- Encabezado branded ----
    let y = margin;
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", margin, y, 46, 46);
      } catch {
        /* ignore */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...dark);
    doc.text(COMPANY, margin + 58, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    doc.text("Estado de cuenta · Cobranza", margin + 58, y + 34);
    doc.text(`Emitido: ${fecha}`, pageW - margin, y + 18, { align: "right" });

    y += 58;
    doc.setDrawColor(...primary);
    doc.setLineWidth(2);
    doc.line(margin, y, pageW - margin, y);
    y += 22;

    // ---- Datos del cliente ----
    const nombre =
      row.contact?.razonSocial ||
      row.contact?.nombreComercial ||
      row.client.nombre;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...dark);
    doc.text(nombre, margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    const datos: string[] = [`Código: ${row.client.id}`];
    if (row.contact?.correo) datos.push(`Correo: ${row.contact.correo}`);
    const tel = row.contact?.telefono || row.client.telefonoPDF;
    if (tel) datos.push(`Tel: ${tel}`);
    doc.text(datos.join("    |    "), margin, y);
    y += 18;

    // ---- Tabla de facturas ----
    const total = row.filteredInvoices.reduce((s, i) => s + i.monto, 0);
    autoTable(doc, {
      startY: y,
      head: [["Documento", "Fecha", "Concepto", "Días vencido", "Monto"]],
      body: row.filteredInvoices.map((inv) => [
        inv.doc,
        inv.fecha,
        inv.concepto || "-",
        inv.diasVencido.toString(),
        formatCurrency(inv.monto),
      ]),
      foot: [["", "", "", "Total adeudo", formatCurrency(total)]],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5, textColor: dark },
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold" },
      footStyles: { fillColor: [241, 245, 249], textColor: dark, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "center" },
        4: { halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // ---- Pie de página ----
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      `${COMPANY} · Documento generado automáticamente`,
      margin,
      pageH - 24,
    );
    doc.text(
      `Página ${idx + 1} de ${visible.length}`,
      pageW - margin,
      pageH - 24,
      { align: "right" },
    );
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`estados-de-cuenta-${stamp}.pdf`);
}
