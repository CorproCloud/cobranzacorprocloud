import * as XLSX from "xlsx";

export interface Contact {
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  correo: string;
  correosSecundarios: string[];
  telefono: string; // for WhatsApp
  diasVencimiento?: number;
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

export async function parseContactsExcel(file: File): Promise<Contact[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return rows
    .map((r): Contact | null => {
      const codigo = pick(r, "CODIGO", "ID", "ID CLIENTE", "CLIENTE");
      if (!codigo) return null;
      const correo = pick(r, "CORREO", "EMAIL");
      const sec = pick(r, "CORREOS SECUNDARIOS", "CORREOS_SECUNDARIOS", "CC");
      const dias = pick(r, "DIAS DE VENCIMIENTO", "DIAS_VENCIMIENTO", "DIAS");
      return {
        codigo: codigo.toString().replace(/\.0$/, ""),
        razonSocial: pick(r, "RAZON SOCIAL", "RAZON_SOCIAL"),
        nombreComercial: pick(r, "NOMBRE COMERCIAL", "NOMBRE_COMERCIAL", "NOMBRE"),
        correo,
        correosSecundarios: sec
          .split(/[;,\n]+/)
          .map((s) => s.trim())
          .filter((s) => s && s.includes("@")),
        telefono: pick(r, "NUMERO TELEFONICO", "TELEFONO", "WHATSAPP", "CELULAR", "TEL"),
        diasVencimiento: dias ? parseInt(dias, 10) || undefined : undefined,
        status: pick(r, "STATUS", "ESTADO") || "ACTIVO",
        observaciones: pick(r, "OBSERVACIONES", "NOTAS"),
      };
    })
    .filter((c): c is Contact => c !== null);
}
