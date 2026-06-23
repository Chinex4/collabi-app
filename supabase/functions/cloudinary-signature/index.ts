import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

const sha1 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ message: 'Missing authorization header' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return json({ message: 'Invalid session' }, 401);

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ message: 'Cloudinary is not configured' }, 500);
  }

  const body = (await req.json().catch(() => null)) as { context?: string } | null;
  const allowedContexts = new Set(['profile', 'project', 'task', 'chat', 'general']);
  if (!body?.context || !allowedContexts.has(body.context)) {
    return json({ message: 'Invalid upload context' }, 422);
  }

  const baseFolder = Deno.env.get('CLOUDINARY_FOLDER') ?? 'collabi';
  const folder = `${baseFolder.replace(/[^a-zA-Z0-9_-]/g, '_')}/${body.context}`;
  const context = `uploaded_by=${auth.user.id}|collabi_context=${body.context}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `context=${context}&folder=${folder}&timestamp=${timestamp}${apiSecret}`;

  return json({
    cloudName,
    apiKey,
    timestamp,
    signature: await sha1(toSign),
    folder,
    context,
  });
});
