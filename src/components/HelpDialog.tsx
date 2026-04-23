import { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function HelpDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cómo usar el Centro de Cobranza</DialogTitle>
          <DialogDescription>
            Guía rápida para automatizar el envío de recordatorios de pago.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <section>
            <h3 className="mb-1 font-semibold">1. Sube los archivos</h3>
            <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Cartera (PDF):</strong> reporte de "Cuentas por Cobrar por Cliente y
                Factura" exportado de tu ERP.
              </li>
              <li>
                <strong>Directorio (Excel/CSV):</strong> con columnas{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">CODIGO</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">RAZON SOCIAL</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">CORREO</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">CORREOS SECUNDARIOS</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">NUMERO TELEFONICO</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">DIAS DE VENCIMIENTO</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">STATUS</code>.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">2. Aplica filtros</h3>
            <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Rango de fechas:</strong> filtra facturas por su fecha de emisión.
              </li>
              <li>
                <strong>Solo vencidas:</strong> activa el toggle para incluir únicamente facturas
                que excedan los días de vencimiento configurados por cliente.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">3. Personaliza la plantilla</h3>
            <p className="text-muted-foreground">
              Variables disponibles:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{Nombre_Cliente}"}</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{Lista_Facturas}"}</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{Total_Adeudo}"}</code>.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">4. Envía recordatorios</h3>
            <p className="text-muted-foreground">
              Pulsa <strong>Correo</strong> para abrir Gmail con el mensaje y destinatarios
              precargados, o <strong>WhatsApp</strong> para abrir un chat con la plantilla lista
              para enviar.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
