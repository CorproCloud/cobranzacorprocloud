import { createClient } from 'npm:@supabase/supabase-js@2';

const GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (c) => c.charCodeAt(0),
);

async function marcarLeido(pid: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await supabase
    .from('cobranza_logs')
    .update({ leido: true, fecha_lectura: new Date().toISOString() })
    .eq('pixel_id', pid)
    .eq('leido', false);
  if (error) console.error('track-pixel update error:', error.message);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pid = url.searchParams.get('pid');
  const redirect = url.searchParams.get('url');

  if (pid && /^[0-9a-f-]{36}$/i.test(pid)) {
    try {
      await marcarLeido(pid);
    } catch (e) {
      console.error('track-pixel error:', e);
    }
  }

  if (redirect && /^https?:\/\//i.test(redirect)) {
    return new Response(null, { status: 302, headers: { Location: redirect } });
  }

  return new Response(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
