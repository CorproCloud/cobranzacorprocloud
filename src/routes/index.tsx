import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { UploadZone } from "@/components/UploadZone";
import { HelpDialog } from "@/components/HelpDialog";
import { TemplateEditor } from "@/components/TemplateEditor";
import { ClientRow } from "@/components/ClientRow";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { parseCarteraPDF, type ClientCartera } from "@/lib/parsers/pdfParser";
import { parseContactsExcel, type Contact } from "@/lib/parsers/excelParser";
import {
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  emailSubject,
  formatCurrency,
} from "@/lib/messaging";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Centro de Cobranza | Cobranza Sistematizada" },
      {
        name: "description",
        content:
          "Automatiza tus recordatorios de pago: procesa cartera (PDF) + directorio (Excel) y genera correos y WhatsApp en un clic.",
      },
    ],
  }),
});

function Dashboard() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [clients, setClients] = useState<ClientCartera[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(true);
  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState(emailSubject(""));
  const [emailTpl, setEmailTpl] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [waTpl, setWaTpl] = useState(DEFAULT_WHATSAPP_TEMPLATE);

  const handlePdf = async (f: File | null) => {
    setPdfFile(f);
    if (!f) {
      setClients([]);
      return;
    }
    setLoadingPdf(true);
    try {
      const parsed = await parseCarteraPDF(f);
      setClients(parsed);
      toast.success(`PDF procesado: ${parsed.length} clientes con cartera`);
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el PDF");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleXlsx = async (f: File | null) => {
    setXlsxFile(f);
    if (!f) {
      setContacts([]);
      return;
    }
    setLoadingXlsx(true);
    try {
      const parsed = await parseContactsExcel(f);
      setContacts(parsed);
      toast.success(`Directorio cargado: ${parsed.length} contactos`);
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el Excel");
    } finally {
      setLoadingXlsx(false);
    }
  };

  const contactsByCode = useMemo(() => {
    const m = new Map<string, Contact>();
    for (const c of contacts) m.set(c.codigo.toString(), c);
    return m;
  }, [contacts]);

  // Apply filters per-client
  const enriched = useMemo(() => {
    return clients
      .map((c) => {
        const contact = contactsByCode.get(c.id);
        const diasUmbral = contact?.diasVencimiento ?? c.diasConfig ?? 0;
        const filteredInvoices = c.invoices.filter((inv) => {
          if (dateFrom && inv.fechaISO < dateFrom) return false;
          if (dateTo && inv.fechaISO > dateTo) return false;
          if (onlyOverdue && inv.diasVencido <= diasUmbral) return false;
          return true;
        });
        return { client: c, contact, filteredInvoices };
      })
      .filter((row) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          row.client.id.includes(q) ||
          row.client.nombre.toLowerCase().includes(q) ||
          row.contact?.razonSocial?.toLowerCase().includes(q) ||
          row.contact?.nombreComercial?.toLowerCase().includes(q)
        );
      });
  }, [clients, contactsByCode, dateFrom, dateTo, onlyOverdue, search]);

  const stats = useMemo(() => {
    const visible = enriched.filter((e) => e.filteredInvoices.length > 0);
    const totalDeuda = visible.reduce(
      (s, e) => s + e.filteredInvoices.reduce((a, i) => a + i.monto, 0),
      0,
    );
    const totalFacturas = visible.reduce((s, e) => s + e.filteredInvoices.length, 0);
    const sinContacto = visible.filter((e) => !e.contact || !e.contact.correo).length;
    return {
      clientes: visible.length,
      totalDeuda,
      totalFacturas,
      sinContacto,
    };
  }, [enriched]);

  const ready = clients.length > 0;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Centro de Cobranza"
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Centro de Cobranza
              </h1>
              <p className="text-xs text-muted-foreground">
                Cobranza sistematizada · Recordatorios automáticos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TemplateEditor
              emailSubject={subject}
              emailTemplate={emailTpl}
              whatsappTemplate={waTpl}
              onChange={(d) => {
                setSubject(d.subject);
                setEmailTpl(d.email);
                setWaTpl(d.whatsapp);
                toast.success("Plantillas actualizadas");
              }}
            />
            <HelpDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Upload zones */}
        <section className="grid gap-4 md:grid-cols-2">
          <UploadZone
            accept="application/pdf,.pdf"
            icon="pdf"
            label="Cartera de clientes (PDF)"
            hint="Reporte de cuentas por cobrar exportado del ERP"
            file={pdfFile}
            onFile={handlePdf}
            loading={loadingPdf}
          />
          <UploadZone
            accept=".xlsx,.xls,.csv"
            icon="excel"
            label="Directorio de contactos (Excel/CSV)"
            hint="Códigos, correos y teléfonos de clientes"
            file={xlsxFile}
            onFile={handleXlsx}
            loading={loadingXlsx}
          />
        </section>

        {ready && (
          <>
            {/* Stats */}
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Clientes con saldo"
                value={stats.clientes.toString()}
              />
              <StatCard
                icon={<Wallet className="h-5 w-5" />}
                label="Deuda total filtrada"
                value={formatCurrency(stats.totalDeuda)}
                emphasis
              />
              <StatCard
                icon={<FileText className="h-5 w-5" />}
                label="Facturas pendientes"
                value={stats.totalFacturas.toString()}
              />
              <StatCard
                icon={
                  stats.sinContacto > 0 ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )
                }
                label="Sin correo de contacto"
                value={stats.sinContacto.toString()}
                tone={stats.sinContacto > 0 ? "warning" : "success"}
              />
            </section>

            {/* Filters */}
            <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search" className="mb-1.5 block text-xs">
                    Buscar cliente
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ID, nombre o razón social…"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="from" className="mb-1.5 block text-xs">
                    Desde
                  </Label>
                  <Input
                    id="from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="to" className="mb-1.5 block text-xs">
                    Hasta
                  </Label>
                  <Input
                    id="to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
                  <Switch
                    id="overdue"
                    checked={onlyOverdue}
                    onCheckedChange={setOnlyOverdue}
                  />
                  <Label htmlFor="overdue" className="cursor-pointer text-sm">
                    Solo facturas vencidas
                  </Label>
                </div>
                {(dateFrom || dateTo || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setSearch("");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </section>

            {/* Table */}
            <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="w-10 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Cliente</th>
                      <th className="px-4 py-3 text-right font-medium">Deuda</th>
                      <th className="px-4 py-3 text-center font-medium">Facturas</th>
                      <th className="px-4 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No hay clientes que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      enriched.map((row) => (
                        <ClientRow
                          key={row.client.id}
                          client={row.client}
                          contact={row.contact}
                          filteredInvoices={row.filteredInvoices}
                          emailTemplate={emailTpl}
                          whatsappTemplate={waTpl}
                          subject={subject}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {!ready && (
          <section className="mt-12 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Carga tu cartera para comenzar
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Sube el PDF de cuentas por cobrar y, opcionalmente, el directorio de contactos. Tus
              archivos se procesan localmente — nunca salen de tu navegador.
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-border bg-card/50 py-4">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-muted-foreground">
          Procesamiento 100% local · Tus datos nunca abandonan tu navegador
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  emphasis,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "warning" | "success";
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-xl bg-[image:var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
          : "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            emphasis
              ? "text-xs font-medium uppercase tracking-wide opacity-90"
              : "text-xs font-medium uppercase tracking-wide text-muted-foreground"
          }
        >
          {label}
        </span>
        <span
          className={
            emphasis
              ? "text-primary-foreground/80"
              : tone === "warning"
                ? "text-warning"
                : tone === "success"
                  ? "text-success"
                  : "text-primary"
          }
        >
          {icon}
        </span>
      </div>
      <div
        className={
          emphasis
            ? "mt-2 text-2xl font-bold tabular-nums"
            : "mt-2 text-2xl font-bold tabular-nums text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}
