CREATE TABLE public.cobranza_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id text NOT NULL,
  cliente_nombre text,
  factura_id text,
  email_cliente text NOT NULL,
  asunto text,
  total numeric NOT NULL DEFAULT 0,
  fecha_envio timestamptz NOT NULL DEFAULT now(),
  leido boolean NOT NULL DEFAULT false,
  fecha_lectura timestamptz,
  pixel_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobranza_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobranza_logs TO anon;
GRANT ALL ON public.cobranza_logs TO service_role;

ALTER TABLE public.cobranza_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso compartido a cobranza_logs"
ON public.cobranza_logs FOR ALL
TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE INDEX idx_cobranza_logs_cliente ON public.cobranza_logs (cliente_id, fecha_envio DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cobranza_logs_updated_at
BEFORE UPDATE ON public.cobranza_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();