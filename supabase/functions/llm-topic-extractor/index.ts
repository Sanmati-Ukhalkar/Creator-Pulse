
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface TopicExtractionRequest {
  content_id: string
  user_id: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { content_id, user_id }: TopicExtractionRequest = await req.json()

    console.log(`Extracting topics from content: ${content_id}`)

    // Get content details
    const { data: content, error: contentError } = await supabase
      .from('ingested_contents')
      .select('*')
      .eq('id', content_id)
      .eq('user_id', user_id)
      .single()

    if (contentError || !content) {
      throw new Error(`Content not found: ${contentError?.message}`)
    }

    // Extract topics using AI/LLM (mock implementation for now)
    const extractedTopics = await extractTopicsFromContent(content)

    // Store extracted topics
    const topicInserts = extractedTopics.map(topic => ({
      user_id,
      source_content_id: content_id,
      title: topic.title,
      description: topic.description,
      topic_type: topic.type || 'general',
      keywords: topic.keywords || [],
      confidence_score: topic.confidence || 0.7,
      trend_score: topic.trend_score || 5,
      is_trending: topic.trend_score > 7
    }))

    const { data: insertedTopics, error: topicError } = await supabase
      .from('topics')
      .insert(topicInserts)
      .select()

    if (topicError) {
      throw new Error(`Failed to insert topics: ${topicError.message}`)
    }

    // Update content status to processed
    await supabase
      .from('ingested_contents')
      .update({ status: 'processed' })
      .eq('id', content_id)

    return new Response(
      JSON.stringify({
        success: true,
        topics_extracted: extractedTopics.length,
        content_id,
        topics: insertedTopics
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Topic extraction error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function extractTopicsFromContent(content: any) {
  // Mock AI topic extraction - in production this would call OpenAI/Claude
  const text = content.raw_content || content.content_md || content.title || ''
  
  // Simple keyword-based topic extraction (placeholder)
  const topics = []
  
  // Tech topics
  if (text.toLowerCase().includes('ai') || text.toLowerCase().includes('artificial intelligence')) {
    topics.push({
      title: 'Artificial Intelligence',
      description: 'Content related to AI and machine learning developments',
      type: 'technology',
      keywords: ['ai', 'artificial intelligence', 'machine learning'],
      confidence: 0.85,
      trend_score: 8
    })
  }
  
  // Business topics
  if (text.toLowerCase().includes('startup') || text.toLowerCase().includes('business')) {
    topics.push({
      title: 'Business & Startups',
      description: 'Content about business strategies and startup insights',
      type: 'business',
      keywords: ['startup', 'business', 'entrepreneur'],
      confidence: 0.75,
      trend_score: 6
    })
  }
  
  // Marketing topics
  if (text.toLowerCase().includes('marketing') || text.toLowerCase().includes('social media')) {
    topics.push({
      title: 'Digital Marketing',
      description: 'Content about marketing strategies and social media',
      type: 'marketing',
      keywords: ['marketing', 'social media', 'digital'],
      confidence: 0.8,
      trend_score: 7
    })
  }
  
  // Default fallback topic if no specific matches
  if (topics.length === 0) {
    topics.push({
      title: 'General Content',
      description: 'General content for review',
      type: 'general',
      keywords: extractKeywords(text),
      confidence: 0.5,
      trend_score: 4
    })
  }
  
  return topics
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    
  // Get unique words and take top 10
  const unique = [...new Set(words)]
  return unique.slice(0, 10)
}
