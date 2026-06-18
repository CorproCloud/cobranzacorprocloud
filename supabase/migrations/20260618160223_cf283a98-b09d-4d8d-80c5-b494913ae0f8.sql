CREATE TABLE public.archivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('pdf','excel')),
  nombre TEXT NOT NULL,
  ruta TEXT NOT NULL,
  tamano BIGINT NOT NULL DEFAULT 0,
  subido_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archivos TO anon, authenticated;
GRANT ALL ON public.archivos TO service_role;

ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso compartido a archivos" ON public.archivos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Storage policies for the shared bucket (anon access)
CREATE POLICY "Lectura compartida cobranza-files" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'cobranza-files');

CREATE POLICY "Subida compartida cobranza-files" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'cobranza-files');

CREATE POLICY "Actualizacion compartida cobranza-files" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'cobranza-files') WITH CHECK (bucket_id = 'cobranza-files');

CREATE POLICY "Borrado compartido cobranza-files" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'cobranza-files');