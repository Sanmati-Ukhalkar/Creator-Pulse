
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // No security verification for now - just process the webhook data
    const data = await req.json()
    console.log('Received n8n webhook data:', data)
    
    const { execution_id, research_data, status, error_message, priority_score } = data

    if (!execution_id) {
      return new Response('Missing execution_id', { status: 400, headers: corsHeaders })
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Update record based on execution_id
    const updateData: any = {
      status: status || 'completed',
      generated_at: new Date().toISOString(),
      research_data: research_data || {},
      updated_at: new Date().toISOString()
    }

    if (error_message) {
      updateData.error_message = error_message
      updateData.status = 'failed'
    }

    if (priority_score !== undefined) {
      updateData.priority_score = priority_score
    }

    console.log('Updating trend research record:', { execution_id, updateData })

    const { data: updatedRecord, error: updateError } = await supabase
      .from('trend_research')
      .update(updateData)
      .eq('n8n_execution_id', execution_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(`Failed to update trend research: ${updateError.message}`, { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    if (!updatedRecord) {
      return new Response('No record found with that execution_id', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    console.log('Successfully updated trend research:', updatedRecord.id)

    return new Response(JSON.stringify({
      success: true,
      trend_id: updatedRecord.id,
      status: updatedRecord.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(`Internal server error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
