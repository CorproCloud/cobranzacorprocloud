import type { Invoice } from "./parsers/pdfParser";

const COMPANY = "REMEDIO PARA EL MAL DE AMORES";

export const DEFAULT_EMAIL_TEMPLATE = `Estimado(a) {Nombre_Cliente},

Esperamos se encuentre bien. Le escribimos para hacerle un atento recordatorio sobre las siguientes facturas pendientes de pago:

{Lista_Facturas}

Total adeudo: {Total_Adeudo}

Le agradeceríamos pueda regularizar su situación a la brevedad. Si ya realizó el pago, por favor haga caso omiso de este mensaje.

Quedamos atentos a cualquier comentario.

Saludos cordiales,
${COMPANY}`;

export const DEFAULT_WHATSAPP_TEMPLATE = `Hola {Nombre_Cliente}, le saluda ${COMPANY}.

Recordatorio amable de las siguientes facturas pendientes:

{Lista_Facturas}

*Total adeudo: {Total_Adeudo}*

Agradecemos su pronta atención. Si ya realizó el pago, por favor ignore este mensaje. ¡Gracias!`;

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

export function buildMessage(
  template: string,
  vars: { nombre: string; invoices: Invoice[]; total: number },
  mode: "email" | "whatsapp",
): string {
  const lista = vars.invoices
    .map((inv) => {
      if (mode === "whatsapp") {
        return `• Factura ${inv.doc} — ${inv.fecha} — ${formatCurrency(inv.monto)} (${inv.diasVencido} días)`;
      }
      return `  • Factura ${inv.doc}  |  Fecha: ${inv.fecha}  |  Monto: ${formatCurrency(inv.monto)}  |  ${inv.diasVencido} días vencida`;
    })
    .join("\n");

  return template
    .replace(/\{Nombre_Cliente\}/g, vars.nombre)
    .replace(/\{Lista_Facturas\}/g, lista)
    .replace(/\{Total_Adeudo\}/g, formatCurrency(vars.total));
}

export function buildMailtoLink(
  to: string,
  cc: string[],
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams();
  if (cc.length) params.set("cc", cc.join(","));
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, "%20")}`;
}

export function buildGmailLink(
  to: string,
  cc: string[],
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  if (cc.length) params.set("cc", cc.join(","));
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function emailSubject(nombre: string): string {
  return `Recordatorio de Pago - ${COMPANY}`;
}
