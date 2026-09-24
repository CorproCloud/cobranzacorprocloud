CREATE TABLE public.cliente_observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_observaciones TO anon, authenticated;
GRANT ALL ON public.cliente_observaciones TO service_role;
ALTER TABLE public.cliente_observaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso compartido a observaciones" ON public.cliente_observaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_obs_cliente ON public.cliente_observaciones (cliente_id, created_at DESC);
CREATE TRIGGER update_obs_updated_at BEFORE UPDATE ON public.cliente_observaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();