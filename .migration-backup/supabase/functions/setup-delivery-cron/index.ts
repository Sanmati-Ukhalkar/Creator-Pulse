import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // This is a placeholder function to document the cron setup.
  // In Supabase dashboard, set a Scheduled Function to POST to /functions/v1/process-delivery
  // e.g., every minute or every 5 minutes.

  return new Response(JSON.stringify({
    message: 'Configure a Supabase Scheduled Function to call process-delivery periodically.',
    endpoint: '/functions/v1/process-delivery',
    cadence: '*/1 * * * *',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Setting up delivery processing cron job...')

    // Enable required extensions
    await supabaseClient.rpc('exec_sql', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;
      `
    })

    // Schedule the delivery processing to run every minute
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT cron.schedule(
          'process-scheduled-deliveries',
          '* * * * *',
          $$
          SELECT net.http_post(
            url := 'https://ifxhfhyvzntkenwklcdl.supabase.co/functions/v1/process-delivery',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body := '{"trigger": "cron"}'::jsonb
          ) as request_id;
          $$
        );
      `
    })

    if (error) {
      console.error('Error setting up cron job:', error)
      throw error
    }

    console.log('Cron job setup completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Delivery processing cron job setup completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in setup-delivery-cron function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
