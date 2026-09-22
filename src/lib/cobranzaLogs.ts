import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/lib/parsers/pdfParser";

export interface CobranzaLog {
  id: string;
  cliente_id: string;
  cliente_nombre: string | null;
  factura_id: string | null;
  email_cliente: string;
  asunto: string | null;
  total: number;
  fecha_envio: string;
  leido: boolean;
  fecha_lectura: string | null;
  pixel_id: string;
}

/** Último envío por cliente */
export async function fetchLatestLogs(): Promise<Map<string, CobranzaLog>> {
  const { data, error } = await supabase
    .from("cobranza_logs")
    .select("*")
    .order("fecha_envio", { ascending: false })
    .limit(2000);
  if (error) throw error;

  const map = new Map<string, CobranzaLog>();
  for (const row of (data ?? []) as CobranzaLog[]) {
    if (!map.has(row.cliente_id)) map.set(row.cliente_id, row);
  }
  return map;
}

export async function sendCobranzaEmail(payload: {
  cliente_id: string;
  cliente_nombre: string;
  email: string;
  cc: string[];
  asunto: string;
  cuerpo: string;
  facturas: Invoice[];
  total: number;
}): Promise<void> {
  const { error } = await supabase.functions.invoke("enviar-cobranza", {
    body: {
      ...payload,
      facturas: payload.facturas.map((f) => ({
        doc: f.doc,
        fecha: f.fecha,
        monto: f.monto,
        diasVencido: f.diasVencido,
      })),
    },
  });
  if (error) throw error;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
