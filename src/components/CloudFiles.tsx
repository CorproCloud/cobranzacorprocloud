import { useRef, useState } from "react";
import {
  Cloud,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type ArchivoNube,
  type TipoArchivo,
  deleteCloudFile,
  updateCloudFile,
} from "@/lib/cloudFiles";
import { toast } from "sonner";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CloudFilesProps {
  files: ArchivoNube[];
  busy: boolean;
  onChanged: () => void;
  onUse: (archivo: ArchivoNube) => void;
}

export function CloudFiles({ files, busy, onChanged, onUse }: CloudFilesProps) {
  const [pendingDelete, setPendingDelete] = useState<ArchivoNube | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<ArchivoNube | null>(null);

  const acceptFor = (tipo: TipoArchivo) =>
    tipo === "pdf" ? "application/pdf,.pdf" : ".xlsx,.xls,.csv";

  const handleReplacePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !replaceTarget) return;
    setWorkingId(replaceTarget.id);
    try {
      await updateCloudFile(replaceTarget, file);
      toast.success("Archivo actualizado en la nube");
      onChanged();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el archivo");
    } finally {
      setWorkingId(null);
      setReplaceTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setWorkingId(pendingDelete.id);
    try {
      await deleteCloudFile(pendingDelete);
      toast.success("Archivo eliminado de la nube");
      onChanged();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo eliminar el archivo");
    } finally {
      setWorkingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Cloud className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Archivos en la nube{" "}
          <span className="text-muted-foreground">({files.length})</span>
        </h2>
      </div>

      {files.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aún no hay archivos guardados. Sube un archivo y guárdalo en la nube
          para reutilizarlo.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => {
            const Icon = f.tipo === "pdf" ? FileText : FileSpreadsheet;
            const working = workingId === f.id;
            return (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.tipo.toUpperCase()} · {fmtSize(f.tamano)} ·{" "}
                    {fmtDate(f.subido_en)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={busy || working}
                    onClick={() => onUse(f)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Usar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    disabled={busy || working}
                    onClick={() => {
                      setReplaceTarget(f);
                      requestAnimationFrame(() => replaceRef.current?.click());
                    }}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${working ? "animate-spin" : ""}`}
                    />
                    Actualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={busy || working}
                    onClick={() => setPendingDelete(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={replaceRef}
        type="file"
        className="hidden"
        accept={replaceTarget ? acceptFor(replaceTarget.tipo) : undefined}
        onChange={handleReplacePick}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar archivo de la nube?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDelete?.nombre}» de forma permanente. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { CloudUpload };
