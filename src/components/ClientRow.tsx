import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Mail, MessageCircle, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

  const nombre =
    contact?.nombreComercial || contact?.razonSocial || client.nombre || `Cliente ${client.id}`;

  const emailLink = useMemo(() => {
    if (!contact?.correo || !filteredInvoices.length) return null;
    const body = buildMessage(
      emailTemplate,
      { nombre, invoices: filteredInvoices, total: filteredTotal },
      "email",
    );
    return buildGmailLink(contact.correo, contact.correosSecundarios, subject, body);
  }, [contact, filteredInvoices, emailTemplate, subject, nombre, filteredTotal]);

  const waLink = useMemo(() => {
    if (!contact?.telefono || !filteredInvoices.length) return null;
    const msg = buildMessage(
      whatsappTemplate,
      { nombre, invoices: filteredInvoices, total: filteredTotal },
      "whatsapp",
    );
    return buildWhatsAppLink(contact.telefono, msg);
  }, [contact, filteredInvoices, whatsappTemplate, nombre, filteredTotal]);

  const hasContact = !!contact;
  const noFiltered = filteredInvoices.length === 0;

  return (
    <>
      <tr
        className={cn(
          "group cursor-pointer border-t border-border transition-colors hover:bg-accent/30",
          noFiltered && "opacity-50",
        )}
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 align-middle">
          <button className="text-muted-foreground" aria-label="Expandir">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-4 py-3 align-middle text-sm font-mono text-muted-foreground">
          {client.id}
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="font-medium text-foreground">{nombre}</div>
          {!hasContact && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> Sin contacto en directorio
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right align-middle font-semibold tabular-nums text-foreground">
          {formatCurrency(filteredTotal)}
          {filteredTotal !== client.total && (
            <div className="text-xs font-normal text-muted-foreground">
              de {formatCurrency(client.total)}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center align-middle">
          <Badge variant="secondary" className="font-mono">
            {filteredInvoices.length}
            <span className="text-muted-foreground">/{client.invoices.length}</span>
          </Badge>
        </td>
        <td className="px-4 py-3 align-middle">
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              disabled={!emailLink}
              asChild={!!emailLink}
              title={!contact?.correo ? "Sin correo" : noFiltered ? "Sin facturas filtradas" : ""}
            >
              {emailLink ? (
                <a href={emailLink} target="_blank" rel="noopener noreferrer">
                  <Mail className="h-3.5 w-3.5" /> Correo
                </a>
              ) : (
                <span>
                  <Mail className="h-3.5 w-3.5" /> Correo
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-success/30 text-success hover:bg-success/10 hover:text-success"
              disabled={!waLink}
              asChild={!!waLink}
              title={!contact?.telefono ? "Sin teléfono" : noFiltered ? "Sin facturas filtradas" : ""}
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
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid gap-4 lg:grid-cols-[1fr,1.4fr]">
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-foreground">Datos de contacto</div>
                <dl className="grid grid-cols-[120px,1fr] gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Razón social</dt>
                  <dd className="text-foreground">{contact?.razonSocial || "—"}</dd>
                  <dt className="text-muted-foreground">Correo</dt>
                  <dd className="break-all text-foreground">{contact?.correo || "—"}</dd>
                  <dt className="text-muted-foreground">CC</dt>
                  <dd className="break-all text-foreground">
                    {contact?.correosSecundarios.join("; ") || "—"}
                  </dd>
                  <dt className="text-muted-foreground">Teléfono</dt>
                  <dd className="text-foreground">{contact?.telefono || "—"}</dd>
                  <dt className="text-muted-foreground">Días config.</dt>
                  <dd className="text-foreground">
                    {contact?.diasVencimiento ?? client.diasConfig ?? "—"}
                  </dd>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{contact?.status || "—"}</dd>
                </dl>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-foreground">
                  Facturas ({filteredInvoices.length})
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Doc</th>
                        <th className="px-3 py-2 text-left font-medium">Fecha</th>
                        <th className="px-3 py-2 text-right font-medium">Días</th>
                        <th className="px-3 py-2 text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.doc} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono">{inv.doc}</td>
                          <td className="px-3 py-1.5">{inv.fecha}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            <span
                              className={cn(
                                inv.diasVencido > 90
                                  ? "text-destructive font-semibold"
                                  : inv.diasVencido > 30
                                    ? "text-warning"
                                    : "text-foreground",
                              )}
                            >
                              {inv.diasVencido}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                            {formatCurrency(inv.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

ClientRow.defaultSubject = defaultSubject;
