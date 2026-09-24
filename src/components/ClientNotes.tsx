import { useEffect, useState } from "react";
import { Loader2, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Nota {
  id: string;
  texto: string;
  created_at: string;
}

const fmt = (s: string) =>
  new Date(s).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

export function ClientNotes({ clienteId }: { clienteId: string }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("cliente_observaciones")
      .select("id, texto, created_at")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (!error) setNotas(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const add = async () => {
    const t = texto.trim();
    if (!t) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("cliente_observaciones")
      .insert({ cliente_id: clienteId, texto: t });
    setSaving(false);
    if (error) return toast.error("No se pudo guardar la observación");
    setTexto("");
    toast.success("Observación guardada");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta observación?")) return;
    const { error } = await (supabase as any).from("cliente_observaciones").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    setNotas((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" /> Observaciones
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe una observación (ej. prometió pagar el viernes)…"
          className="min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add();
          }}
        />
        <Button size="sm" onClick={add} disabled={saving || !texto.trim()} className="sm:self-end">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : notas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin observaciones todavía.</p>
        ) : (
          notas.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2">
              <div className="flex-1">
                <p className="whitespace-pre-wrap text-sm text-foreground">{n.texto}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmt(n.created_at)}</p>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar observación"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
