import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';

interface Factura {
  doc: string;
  fecha: string;
  monto: number;
  diasVencido: number;
}

interface Payload {
  cliente_id: string;
  cliente_nombre: string;
  email: string;
  cc?: string[];
  asunto: string;
  cuerpo: string;
  facturas: Factura[];
  total: number;
}

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

function buildHtml(cuerpo: string, facturas: Factura[], total: number, pixelUrl: string) {
  const rows = facturas
    .map(
      (f) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace">${esc(f.doc)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(f.fecha)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${f.diasVencido}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${money(f.monto)}</td>
      </tr>`,
    )
    .join('');

  const texto = esc(cuerpo)
    .split(/\n/)
    .filter((l) => !/^\s*[•·]/.test(l))
    .join('<br/>');

  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#b91c1c;color:#fff;padding:16px 24px;font-size:16px;font-weight:bold">Centro de Cobranza</div>
    <div style="padding:24px;font-size:14px;line-height:1.6">
      <div>${texto}</div>
      ${
        facturas.length
          ? `<table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
        <thead><tr style="background:#f3f4f6;text-align:left">
          <th style="padding:8px">Factura</th><th style="padding:8px">Fecha</th>
          <th style="padding:8px;text-align:right">Días</th><th style="padding:8px;text-align:right">Monto</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3" style="padding:10px;text-align:right;font-weight:bold">Total adeudo</td>
        <td style="padding:10px;text-align:right;font-weight:bold;color:#b91c1c">${money(total)}</td></tr></tfoot>
      </table>`
          : ''
      }
    </div>
  </div>
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body?.email || !body?.cliente_id || !body?.asunto) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: log, error: logError } = await supabase
      .from('cobranza_logs')
      .insert({
        cliente_id: body.cliente_id,
        cliente_nombre: body.cliente_nombre ?? null,
        factura_id: body.facturas?.map((f) => f.doc).join(', ') ?? null,
        email_cliente: body.email,
        asunto: body.asunto,
        total: body.total ?? 0,
      })
      .select()
      .single();

    if (logError) throw new Error(`No se pudo registrar el envío: ${logError.message}`);

    const pixelUrl = `${supabaseUrl}/functions/v1/track-pixel?pid=${log.pixel_id}`;
    const html = buildHtml(body.cuerpo ?? '', body.facturas ?? [], body.total ?? 0, pixelUrl);

    const boundary = `bnd_${crypto.randomUUID()}`;
    const headers = [
      `To: ${body.email}`,
      body.cc?.length ? `Cc: ${body.cc.join(', ')}` : null,
      `Subject: ${header(body.asunto)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean);

    const raw = [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body.cuerpo ?? '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const encoded = b64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'X-Connection-Api-Key': Deno.env.get('GOOGLE_MAIL_API_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${details}`);
      await supabase.from('cobranza_logs').delete().eq('id', log.id);
      return new Response(
        JSON.stringify({ error: 'No se pudo enviar el correo', status: res.status, details }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('enviar-cobranza error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
