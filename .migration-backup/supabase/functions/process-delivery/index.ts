// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Basic permissive CORS for scheduler/webhook calls
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Brevo (Sendinblue) secrets
const brevoApiKey = Deno.env.get('BREVO_API_KEY');
const brevoFromEmail = Deno.env.get('BREVO_FROM_EMAIL');
const brevoFromName = Deno.env.get('BREVO_FROM_NAME') || 'CreatorPulse';

interface DeliverySchedule {
  id: string;
  user_id: string;
  platform: string;
  content_type: string;
  scheduled_for: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  draft_id?: string | null;
  auto_generate?: boolean;
  custom_prompt?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Remove GET diagnostic for security

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    // Verify JWT (enforced via config), but also ensure request is authenticated.
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Optional overrides for testing: { scheduleId?: string, minutesAhead?: number }
    let scheduleId: string | undefined;
    let minutesAhead = 0;
    try {
      const body = await req.json();
      scheduleId = body?.scheduleId;
      minutesAhead = Number(body?.minutesAhead) || 0;
    } catch { /* no body */ }

    const now = new Date();
    const horizon = new Date(now.getTime() + minutesAhead * 60 * 1000).toISOString();

    let dueQuery = supabase
      .from('delivery_schedules')
      .select(`id,user_id,platform,content_type,scheduled_for,status,draft_id,auto_generate,custom_prompt`)
      .eq('status', 'scheduled')
      .limit(25);

    if (scheduleId) {
      dueQuery = dueQuery.eq('id', scheduleId);
    } else {
      dueQuery = dueQuery.lte('scheduled_for', horizon || now.toISOString());
    }

    const { data: due, error: dueError } = await dueQuery;

    if (dueError) throw new Error(`Failed to query due deliveries: ${dueError.message}`);

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const item of (due || []) as DeliverySchedule[]) {
      try {
        // Mark processing
        await supabase
          .from('delivery_schedules')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Fetch user profile for recipient email
        const { data: profile, error: profileError } = await supabase
          .from('creator_profiles')
          .select('email, full_name')
          .eq('user_id', item.user_id)
          .single();
        if (profileError || !profile?.email) {
          throw new Error('Recipient email not found for user');
        }

        // Fetch draft content
        if (!item.draft_id) {
          throw new Error('No draft associated with schedule (auto-generate not implemented)');
        }
        const { data: draft, error: draftError } = await supabase
          .from('drafts')
          .select('title, content')
          .eq('id', item.draft_id)
          .single();
        if (draftError || !draft) {
          throw new Error('Draft not found');
        }

        if (!brevoApiKey || !brevoFromEmail) {
          const missing: string[] = [];
          if (!brevoApiKey) missing.push('BREVO_API_KEY');
          if (!brevoFromEmail) missing.push('BREVO_FROM_EMAIL');
          // Diagnostic only: surfaced in logs; UI only receives generic error text
          console.error('Brevo config missing env(s):', missing.join(', '));
          throw new Error(missing.length ? `Missing ${missing.join(', ')}` : 'Missing BREVO_API_KEY or BREVO_FROM_EMAIL');
        }

        const subject = `[CreatorPulse] Scheduled ${item.platform} ${item.content_type}`;
        const contentText = draft?.content?.text ?? JSON.stringify(draft?.content ?? {});
        const html = `
          <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            <h2 style="margin:0 0 12px">Your scheduled draft is ready</h2>
            <p style="color:#555;margin:0 0 16px">Platform: <b>${item.platform}</b> · Type: <b>${item.content_type}</b></p>
            <h3 style="margin:16px 0 8px">${draft.title ?? 'Untitled Draft'}</h3>
            <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:6px">${escapeHtml(contentText)}</pre>
            <p style="color:#777;margin-top:16px">Sent automatically by CreatorPulse.</p>
          </div>`;

        // Send via Brevo (Sendinblue)
        const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { email: brevoFromEmail, name: brevoFromName },
            to: [{ email: profile.email, name: profile.full_name || profile.email }],
            subject,
            textContent: `${draft.title ?? 'Draft'}\n\n${contentText}`,
            htmlContent: html,
          }),
        });

        if (!brevoResp.ok) {
          const errText = await brevoResp.text();
          throw new Error(`Brevo error (${brevoResp.status}): ${errText}`);
        }

        // Mark sent
        await supabase
          .from('delivery_schedules')
          .update({ status: 'sent' })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'sent' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ id: (item as any).id, status: 'failed', error: message });
        await createClient(supabaseUrl, supabaseServiceKey)
          .from('delivery_schedules')
          .update({ status: 'failed' })
          .eq('id', (item as any).id);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
