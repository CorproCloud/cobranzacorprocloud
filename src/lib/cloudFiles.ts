import { supabase } from "@/integrations/supabase/client";

const BUCKET = "cobranza-files";

export type TipoArchivo = "pdf" | "excel";

export interface ArchivoNube {
  id: string;
  tipo: TipoArchivo;
  nombre: string;
  ruta: string;
  tamano: number;
  subido_en: string;
}

/** Lista los archivos guardados, más recientes primero. */
export async function listCloudFiles(): Promise<ArchivoNube[]> {
  const { data, error } = await supabase
    .from("archivos")
    .select("*")
    .order("subido_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ArchivoNube[];
}

function buildPath(tipo: TipoArchivo, name: string) {
  const safe = name.replace(/[^\w.\-]+/g, "_");
  return `${tipo}/${Date.now()}_${safe}`;
}

/** Sube un archivo nuevo a la nube y registra su metadata. */
export async function uploadCloudFile(
  tipo: TipoArchivo,
  file: File,
): Promise<ArchivoNube> {
  const ruta = buildPath(tipo, file.name);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("archivos")
    .insert({ tipo, nombre: file.name, ruta, tamano: file.size })
    .select()
    .single();
  if (error) throw error;
  return data as ArchivoNube;
}

/** Reemplaza el contenido de un archivo existente conservando su registro. */
export async function updateCloudFile(
  archivo: ArchivoNube,
  file: File,
): Promise<ArchivoNube> {
  const ruta = buildPath(archivo.tipo, file.name);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;

  // Borra el archivo antiguo del storage (best-effort).
  await supabase.storage.from(BUCKET).remove([archivo.ruta]);

  const { data, error } = await supabase
    .from("archivos")
    .update({ nombre: file.name, ruta, tamano: file.size, subido_en: new Date().toISOString() })
    .eq("id", archivo.id)
    .select()
    .single();
  if (error) throw error;
  return data as ArchivoNube;
}

/** Quita un archivo de la nube (storage + registro). */
export async function deleteCloudFile(archivo: ArchivoNube): Promise<void> {
  await supabase.storage.from(BUCKET).remove([archivo.ruta]);
  const { error } = await supabase.from("archivos").delete().eq("id", archivo.id);
  if (error) throw error;
}

/** Descarga un archivo de la nube como objeto File para reprocesarlo. */
export async function downloadCloudFile(archivo: ArchivoNube): Promise<File> {
  const { data, error } = await supabase.storage.from(BUCKET).download(archivo.ruta);
  if (error || !data) throw error ?? new Error("No se pudo descargar el archivo");
  return new File([data], archivo.nombre, { type: data.type });
}
