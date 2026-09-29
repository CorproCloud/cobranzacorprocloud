import * as XLSX from "xlsx";

export interface Contact {
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  correo: string;
  correosSecundarios: string[];
  correosCompras: string[];
  correosPagos: string[];
  telefono: string; // for WhatsApp
  diasVencimiento?: number;
  agente: string;
  status: string;
  observaciones: string;
}

const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of Object.keys(row)) {
    const nk = norm(k);
    for (const want of keys) {
      if (nk === norm(want)) return (row[k] ?? "").toString().trim();
    }
  }
  return "";
}

function parseEmails(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[;,\n]+/)
        .map((email) => email.trim())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  );
}

export async function parseContactsExcel(file: File): Promise<Contact[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return rows
    .map((r): Contact | null => {
      const codigo = pick(r, "CODIGO", "ID", "ID CLIENTE", "CLIENTE");
      if (!codigo) return null;
      const correosCompras = parseEmails(pick(r, "CORREOS COMPRAS", "CORREOS_COMPRAS"));
      const correosPagos = parseEmails(pick(r, "CORREOS PAGOS", "CORREOS_PAGOS"));
      const correosAnteriores = parseEmails(
        [
          pick(r, "CORREO", "EMAIL"),
          pick(r, "CORREOS SECUNDARIOS", "CORREOS_SECUNDARIOS", "CC"),
        ].join(";"),
      );
      const todosLosCorreos = Array.from(
        new Set([...correosCompras, ...correosPagos, ...correosAnteriores]),
      );
      const dias = pick(r, "DIAS DE VENCIMIENTO", "DIAS_VENCIMIENTO", "DIAS");
      return {
        codigo: codigo.toString().replace(/\.0$/, ""),
        razonSocial: pick(r, "RAZON SOCIAL", "RAZON_SOCIAL"),
        nombreComercial: pick(r, "NOMBRE COMERCIAL", "NOMBRE_COMERCIAL", "NOMBRE"),
        correo: todosLosCorreos[0] ?? "",
        correosSecundarios: todosLosCorreos.slice(1),
        correosCompras,
        correosPagos,
        telefono: pick(r, "NUMERO TELEFONICO", "TELEFONO", "WHATSAPP", "CELULAR", "TEL"),
        diasVencimiento: dias ? parseInt(dias, 10) || undefined : undefined,
        agente: pick(r, "AGENTE", "VENDEDOR", "EJECUTIVO"),
        status: pick(r, "STATUS", "ESTADO") || "ACTIVO",
        observaciones: pick(r, "OBSERVACIONES", "NOTAS"),
      };
    })
    .filter((c): c is Contact => c !== null);
}
