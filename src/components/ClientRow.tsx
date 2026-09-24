import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MailCheck,
  AlertCircle,
  FileText,
  Phone,
  AtSign,
  Send,
  Users,
  CalendarClock,
  BadgeCheck,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { ClientCartera, Invoice } from "@/lib/parsers/pdfParser";
import type { Contact } from "@/lib/parsers/excelParser";
import {
  buildGmailLink,
  buildMessage,
  emailSubject as defaultSubject,
  formatCurrency,
} from "@/lib/messaging";
import { buildClientImage, downloadClientImage } from "@/lib/clientImage";
import {
  type CobranzaLog,
  formatDateTime,
  sendCobranzaEmail,
} from "@/lib/cobranzaLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientNotes } from "@/components/ClientNotes";

interface Props {
  client: ClientCartera;
  contact?: Contact;
  filteredInvoices: Invoice[];
  emailTemplate: string;
  whatsappTemplate: string;
  subject: string;
  log?: CobranzaLog | null;
  onSent?: () => void;
}

export function ClientRow({
  client,
  contact,
  filteredInvoices,
  emailTemplate,
  subject,
  log,
  onSent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [emailPickerOpen, setEmailPickerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmails, setManualEmails] = useState("");
  const [sending, setSending] = useState(false);

  const filteredTotal = useMemo(
    () => filteredInvoices.reduce((s, i) => s + i.monto, 0),
    [filteredInvoices],
  );

  // Razón social = nombre principal del cliente
  const principal = contact?.razonSocial || client.nombre || `Cliente ${client.id}`;
  const secundario = contact?.nombreComercial || "";

  const cuerpo = useMemo(
    () =>
      buildMessage(
        emailTemplate,
        { nombre: principal, invoices: filteredInvoices, total: filteredTotal },
        "email",
      ),
    [emailTemplate, principal, filteredInvoices, filteredTotal],
  );

  const gmailLink = useMemo(() => {
    if (!contact?.correo || !filteredInvoices.length) return null;
    return buildGmailLink(contact.correo, contact.correosSecundarios, subject, cuerpo);
  }, [contact, filteredInvoices, subject, cuerpo]);

  const hasContact = !!contact;
  const noFiltered = filteredInvoices.length === 0;

  const canSendDirect = !!contact?.correo && filteredInvoices.length > 0;

  const sendTo = async (email: string, cc: string[]) => {
    setSending(true);
    try {
      await sendCobranzaEmail({
        cliente_id: client.id,
        cliente_nombre: principal,
        email,
        cc,
        asunto: subject,
        cuerpo,
        facturas: filteredInvoices,
        total: filteredTotal,
      });
      toast.success(`Correo enviado a ${email}`);
      onSent?.();
      return true;
    } catch (e) {
      console.error(e);
      toast.error("No se pudo enviar el correo");
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleDirectSend = async () => {
    if (!contact?.correo) return;
    await sendTo(contact.correo, contact.correosSecundarios ?? []);
    setEmailPickerOpen(false);
  };

  const handleManualSend = async () => {
    const lista = manualEmails
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const invalido = lista.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (!lista.length) {
      toast.error("Escribe al menos un correo");
      return;
    }
    if (invalido) {
      toast.error(`Correo no válido: ${invalido}`);
      return;
    }
    const ok = await sendTo(lista[0], lista.slice(1));
    if (ok) {
      setManualOpen(false);
      setManualEmails("");
    }
  };

  const handleDownloadImage = () => {
    try {
      const dataUrl = buildClientImage({
        nombre: principal,
        clienteId: client.id,
        invoices: filteredInvoices,
        total: filteredTotal,
      });
      downloadClientImage(
        `Adeudo-${client.id}-${principal.replace(/[^\w\s-]/g, "").trim().slice(0, 30)}.png`,
        dataUrl,
      );
      toast.success("Imagen descargada, lista para enviar por WhatsApp");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la imagen");
    }
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-all",
        open ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:border-primary/30",
        noFiltered && "opacity-60",
      )}
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-accent/30"
      >
        {/* ID badge */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
          {client.id}
        </div>

        {/* Names */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold uppercase tracking-tight text-foreground">
              {principal}
            </h3>
            {open ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          {secundario && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{secundario}</p>
          )}
          {!hasContact && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> Sin contacto en directorio
            </div>
          )}
        </div>

        {/* Último envío + estado de lectura */}
        <div className="hidden w-[200px] shrink-0 lg:block">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Último envío
          </div>
          <div className="truncate text-xs text-foreground">
            {log ? formatDateTime(log.fecha_envio) : "No enviado"}
          </div>
          <div className="mt-1">
            {log ? (
              log.leido ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                  <MailCheck className="h-3 w-3" /> Leído {formatDateTime(log.fecha_lectura)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" /> Enviado
                </span>
              )
            ) : (
              <span className="text-[11px] text-muted-foreground">Sin seguimiento</span>
            )}
          </div>
        </div>

        {/* Total + invoice count */}
        <div className="hidden text-right sm:block">
          <div className="text-base font-bold tabular-nums text-destructive">
            {formatCurrency(filteredTotal)}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {filteredInvoices.length} {filteredInvoices.length === 1 ? "factura" : "facturas"}
          </div>
        </div>

        {/* Cobrar button (primary action) */}
        <div
          className="flex shrink-0 gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Button
            size="sm"
            variant="success"
            className="gap-1.5"
            disabled={!canSendDirect || sending}
            onClick={handleDirectSend}
            title={
              !contact?.correo
                ? "Sin correo de contacto"
                : noFiltered
                  ? "Sin facturas filtradas"
                  : "Enviar cobro por correo"
            }
          >
            {sending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? "Enviando…" : "Cobrar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!gmailLink}
            onClick={() => setEmailPickerOpen(true)}
            title="Abrir en Gmail"
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>

      {/* Total row mobile */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 sm:hidden">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          {filteredInvoices.length} {filteredInvoices.length === 1 ? "factura" : "facturas"}
        </span>
        <span className="text-sm font-bold tabular-nums text-destructive">
          {formatCurrency(filteredTotal)}
        </span>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-border bg-muted/20">
          {/* Contact info card */}
          <div className="grid gap-3 border-b border-border px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField
              icon={<Users className="h-3.5 w-3.5" />}
              label="Razón social"
              value={contact?.razonSocial || "—"}
            />
            <InfoField
              icon={<AtSign className="h-3.5 w-3.5" />}
              label="Correo"
              value={contact?.correo || "—"}
              mono
            />
            <InfoField
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Correos CC"
              value={contact?.correosSecundarios.join("; ") || "—"}
              mono
            />
            <InfoField
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Teléfono"
              value={contact?.telefono || "—"}
              mono
            />
            <InfoField
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              label="Días configurados"
              value={(contact?.diasVencimiento ?? client.diasConfig)?.toString() || "—"}
            />
            <InfoField
              icon={<BadgeCheck className="h-3.5 w-3.5" />}
              label="Estatus"
              value={contact?.status || "—"}
            />
            {/* Secondary actions */}
            <div className="sm:col-span-2 lg:col-span-2 flex items-end justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={!gmailLink}
                onClick={() => setEmailPickerOpen(true)}
              >
                <Mail className="h-3.5 w-3.5" /> Enviar correo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={noFiltered || sending}
                onClick={() => setManualOpen(true)}
                title="Escribe uno o varios correos separados por ;"
              >
                <AtSign className="h-3.5 w-3.5" /> Enviar sin correo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-success/30 text-success hover:bg-success/10 hover:text-success"
                disabled={noFiltered}
                onClick={handleDownloadImage}
                title="Descargar imagen PNG lista para enviar por WhatsApp"
              >
                <Download className="h-3.5 w-3.5" /> Descargar
              </Button>
            </div>
          </div>

          <ClientNotes clienteId={client.id} />

          {/* Invoices table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Documento</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Concepto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Días Vencido</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.doc}
                    className="border-t border-border transition-colors hover:bg-accent/20"
                  >
                    <td className="px-4 py-2.5 font-mono text-foreground">{inv.doc}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.fecha}</td>
                    <td className="px-4 py-2.5 text-foreground">{inv.concepto || "Factura"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          inv.diasVencido > 90
                            ? "text-destructive"
                            : inv.diasVencido > 30
                              ? "text-warning"
                              : "text-foreground",
                        )}
                      >
                        {inv.diasVencido}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                      {formatCurrency(inv.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gmail */}
      <Dialog open={emailPickerOpen} onOpenChange={setEmailPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar cobro por correo</DialogTitle>
            <DialogDescription>
              Se abrirá Gmail con el mensaje listo para enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              disabled={!gmailLink}
              onClick={() => {
                if (gmailLink) window.open(gmailLink, "_blank", "noopener,noreferrer");
                setEmailPickerOpen(false);
              }}
            >
              <Mail className="h-4 w-4 text-gmail" /> Gmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Envío manual con seguimiento */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar a otros correos</DialogTitle>
            <DialogDescription>
              Escribe uno o varios correos separados por punto y coma (;). El envío se registra con
              seguimiento de enviado y leído.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              autoFocus
              placeholder="correo1@dominio.com; correo2@dominio.com"
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !sending) handleManualSend();
              }}
            />
            <Button variant="success" disabled={sending} onClick={handleManualSend} className="gap-2">
              {sending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function InfoField({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "break-words text-xs text-foreground",
          mono && "font-mono",
          value === "—" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

ClientRow.defaultSubject = defaultSubject;
