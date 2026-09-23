import type { Invoice } from "@/lib/parsers/pdfParser";
import { formatCurrency } from "@/lib/messaging";

const W = 900;
const ROW_H = 34;

/** Genera un PNG con el desglose de adeudo del cliente (para compartir por WhatsApp) */
export function buildClientImage(opts: {
  nombre: string;
  clienteId: string;
  invoices: Invoice[];
  total: number;
  empresa?: string;
}): string {
  const { nombre, clienteId, invoices, total } = opts;
  const empresa = opts.empresa ?? "REMEDIO PARA EL MAL DE AMORES";

  const headerH = 96;
  const infoH = 78;
  const tableHeadH = 40;
  const footerH = 96;
  const H = headerH + infoH + tableHeadH + invoices.length * ROW_H + footerH;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la imagen");
  ctx.scale(scale, scale);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Encabezado
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial, Helvetica, sans-serif";
  ctx.fillText("Estado de cuenta", 32, 42);
  ctx.font = "15px Arial, Helvetica, sans-serif";
  ctx.fillText(empresa, 32, 70);

  const fecha = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  ctx.textAlign = "right";
  ctx.font = "14px Arial, Helvetica, sans-serif";
  ctx.fillText(fecha, W - 32, 70);
  ctx.textAlign = "left";

  // Datos del cliente
  let y = headerH + 34;
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px Arial, Helvetica, sans-serif";
  ctx.fillText(nombre.toUpperCase().slice(0, 52), 32, y);
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Arial, Helvetica, sans-serif";
  ctx.fillText(`Cliente ${clienteId}  ·  ${invoices.length} factura(s) pendiente(s)`, 32, y + 24);

  // Encabezado de tabla
  y = headerH + infoH;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(32, y, W - 64, tableHeadH);
  ctx.fillStyle = "#374151";
  ctx.font = "bold 13px Arial, Helvetica, sans-serif";
  ctx.fillText("FACTURA", 48, y + 26);
  ctx.fillText("FECHA", 230, y + 26);
  ctx.textAlign = "right";
  ctx.fillText("DÍAS", 620, y + 26);
  ctx.fillText("MONTO", W - 48, y + 26);
  ctx.textAlign = "left";

  // Filas
  y += tableHeadH;
  ctx.font = "14px Arial, Helvetica, sans-serif";
  invoices.forEach((inv, i) => {
    if (i % 2 === 1) {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(32, y, W - 64, ROW_H);
    }
    ctx.fillStyle = "#111827";
    ctx.fillText(String(inv.doc), 48, y + 22);
    ctx.fillStyle = "#4b5563";
    ctx.fillText(String(inv.fecha), 230, y + 22);
    ctx.textAlign = "right";
    ctx.fillStyle = inv.diasVencido > 90 ? "#b91c1c" : "#4b5563";
    ctx.fillText(String(inv.diasVencido), 620, y + 22);
    ctx.fillStyle = "#111827";
    ctx.fillText(formatCurrency(inv.monto), W - 48, y + 22);
    ctx.textAlign = "left";

    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(32, y + ROW_H);
    ctx.lineTo(W - 32, y + ROW_H);
    ctx.stroke();
    y += ROW_H;
  });

  // Total
  ctx.fillStyle = "#fef2f2";
  ctx.fillRect(32, y, W - 64, 48);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 16px Arial, Helvetica, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("TOTAL ADEUDO", 620, y + 31);
  ctx.fillStyle = "#b91c1c";
  ctx.font = "bold 20px Arial, Helvetica, sans-serif";
  ctx.fillText(formatCurrency(total), W - 48, y + 31);
  ctx.textAlign = "left";

  // Pie
  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.fillText(
    "Si ya realizó el pago, favor de ignorar este mensaje. Gracias por su preferencia.",
    32,
    y + 76,
  );

  return canvas.toDataURL("image/png");
}

export function downloadClientImage(fileName: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
