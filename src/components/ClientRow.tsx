import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  AlertCircle,
  FileText,
  Phone,
  AtSign,
  Users,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";
import type { ClientCartera, Invoice } from "@/lib/parsers/pdfParser";
import type { Contact } from "@/lib/parsers/excelParser";
import {
  buildGmailLink,
  buildMessage,
  buildWhatsAppLink,
  emailSubject as defaultSubject,
  formatCurrency,
} from "@/lib/messaging";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  client: ClientCartera;
  contact?: Contact;
  filteredInvoices: Invoice[];
  emailTemplate: string;
  whatsappTemplate: string;
  subject: string;
}

export function ClientRow({
  client,
  contact,
  filteredInvoices,
  emailTemplate,
  whatsappTemplate,
  subject,
}: Props) {
  const [open, setOpen] = useState(false);

  const filteredTotal = useMemo(
    () => filteredInvoices.reduce((s, i) => s + i.monto, 0),
    [filteredInvoices],
  );

  // Razón social = nombre principal del cliente
  const principal =
    contact?.razonSocial || client.nombre || `Cliente ${client.id}`;
  const secundario = contact?.nombreComercial || "";

  const emailLink = useMemo(() => {
    if (!contact?.correo || !filteredInvoices.length) return null;
    const body = buildMessage(
      emailTemplate,
      { nombre: principal, invoices: filteredInvoices, total: filteredTotal },
      "email",
    );
    return buildGmailLink(contact.correo, contact.correosSecundarios, subject, body);
  }, [contact, filteredInvoices, emailTemplate, subject, principal, filteredTotal]);

  const waLink = useMemo(() => {
    if (!contact?.telefono || !filteredInvoices.length) return null;
    const msg = buildMessage(
      whatsappTemplate,
      { nombre: principal, invoices: filteredInvoices, total: filteredTotal },
      "whatsapp",
    );
    return buildWhatsAppLink(contact.telefono, msg);
  }, [contact, filteredInvoices, whatsappTemplate, principal, filteredTotal]);

  const hasContact = !!contact;
  const noFiltered = filteredInvoices.length === 0;
  const hasAnyAction = !!emailLink || !!waLink;

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
            disabled={!waLink && !emailLink}
            asChild={hasAnyAction}
            title={
              !contact
                ? "Sin contacto"
                : noFiltered
                  ? "Sin facturas filtradas"
                  : "Enviar cobro"
            }
          >
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" /> Cobrar
              </a>
            ) : emailLink ? (
              <a href={emailLink} target="_blank" rel="noopener noreferrer">
                <Mail className="h-3.5 w-3.5" /> Cobrar
              </a>
            ) : (
              <span>
                <MessageCircle className="h-3.5 w-3.5" /> Cobrar
              </span>
            )}
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
                disabled={!emailLink}
                asChild={!!emailLink}
              >
                {emailLink ? (
                  <a href={emailLink} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-3.5 w-3.5" /> Enviar correo
                  </a>
                ) : (
                  <span>
                    <Mail className="h-3.5 w-3.5" /> Enviar correo
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-success/30 text-success hover:bg-success/10 hover:text-success"
                disabled={!waLink}
                asChild={!!waLink}
              >
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                ) : (
                  <span>
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </span>
                )}
              </Button>
            </div>
          </div>

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
