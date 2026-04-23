import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, FileText, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  accept: string;
  icon: "pdf" | "excel";
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  loading?: boolean;
}

export function UploadZone({ accept, icon, label, hint, file, onFile, loading }: UploadZoneProps) {
  const [drag, setDrag] = useState(false);
  const Icon = icon === "pdf" ? FileText : FileSpreadsheet;

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card p-6 text-center transition-all",
        drag
          ? "border-primary bg-accent/30 scale-[1.01]"
          : file
            ? "border-success/40 bg-success/5"
            : "border-border hover:border-primary/40 hover:bg-accent/20",
        loading && "pointer-events-none opacity-70",
      )}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          file ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
        )}
      >
        {file ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {file ? file.name : label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {file ? `${(file.size / 1024).toFixed(1)} KB` : hint}
        </p>
      </div>
      {!file && (
        <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Upload className="h-3.5 w-3.5" />
          Arrastra o haz clic para subir
        </div>
      )}
      {file && !loading && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onFile(null);
          }}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Eliminar archivo"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </label>
  );
}
