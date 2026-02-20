
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Updated n8n webhook URL to ngrok
const n8nWebhookUrl = 'https://e6c0aba165b2.ngrok-free.app/webhook-test/749b6d5f-82ff-4334-9368-646fdb9c3dd8'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders })
    }

    const { title, categories = [] } = await req.json()

    if (!title) {
      return new Response('Title is required', { status: 400, headers: corsHeaders })
    }

    // Check rate limiting
    const { data: canTrigger } = await supabase.rpc('can_trigger_trend_research', {
      p_user_id: user.id,
      p_minutes: 5
    })

    if (!canTrigger) {
      return new Response('Rate limit exceeded. Please wait 5 minutes between requests.', { 
        status: 429, 
        headers: corsHeaders 
      })
    }

    // Generate execution ID for idempotency
    const executionId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Insert pending record
    const { data: trendRecord, error: insertError } = await supabase
      .from('trend_research')
      .insert({
        user_id: user.id,
        title,
        categories,
        status: 'pending',
        n8n_execution_id: executionId
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response('Failed to create trend research record', { status: 500, headers: corsHeaders })
    }

    // Prepare payload for n8n webhook (no security for now)
    const payload = {
      execution_id: executionId,
      user_id: user.id,
      trend_id: trendRecord.id,
      title,
      categories
    }

    console.log('Triggering n8n webhook:', { url: n8nWebhookUrl, payload })

    // Trigger n8n workflow
    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('n8n response status:', n8nResponse.status)
      
      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text()
        console.error('n8n webhook failed:', n8nResponse.status, errorText)
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`)
      }

      // Update status to processing
      await supabase
        .from('trend_research')
        .update({ status: 'processing' })
        .eq('id', trendRecord.id)

      console.log('Trend research triggered successfully:', executionId)

      return new Response(JSON.stringify({
        success: true,
        trend_id: trendRecord.id,
        execution_id: executionId,
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (webhookError) {
      console.error('n8n webhook error:', webhookError)
      
      // Update record with error
      await supabase
        .from('trend_research')
        .update({ 
          status: 'failed',
          error_message: `Webhook failed: ${webhookError.message}`
        })
        .eq('id', trendRecord.id)

      return new Response('Failed to trigger n8n workflow', { status: 500, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
