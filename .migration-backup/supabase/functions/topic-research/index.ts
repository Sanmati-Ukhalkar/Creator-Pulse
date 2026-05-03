
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

interface ResearchRequest {
  topic_id: string
  user_id: string
  depth_level: 'quick' | 'detailed' | 'comprehensive'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { topic_id, user_id, depth_level = 'detailed' }: ResearchRequest = await req.json()
    // Normalize depth to match DB constraint: 'surface' | 'medium' | 'deep'
    const normalizeDepth = (d: string) => {
      const map: Record<string,string> = { quick: 'surface', detailed: 'medium', comprehensive: 'deep' }
      const allowed = new Set(['surface','medium','deep'])
      if (allowed.has(d)) return d
      return map[d] || 'medium'
    }
    const normDepth = normalizeDepth(depth_level)

    console.log(`Starting research for topic: ${topic_id}, depth: ${depth_level}`)

    // Get topic details
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topic_id)
      .eq('user_id', user_id)
      .single()

    if (topicError || !topic) {
      throw new Error(`Topic not found: ${topicError?.message}`)
    }

    // Check if we have cached research that's still valid
    const { data: existingResearch } = await supabase
      .from('topic_research')
      .select('*')
      .eq('topic_id', topic_id)
      .eq('depth_level', normDepth)
      .gte('cached_until', new Date().toISOString())
      .single()

    if (existingResearch) {
      console.log('Returning cached research')
      return new Response(
        JSON.stringify({
          success: true,
          research: existingResearch,
          cached: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Perform AI research
    const research = await performTopicResearch(topic, normDepth)

    // Calculate cache duration based on depth
    const cacheHours = normDepth === 'surface' ? 6 : normDepth === 'medium' ? 24 : 72
    const cachedUntil = new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString()

    // Store research results
    const { data: savedResearch, error: saveError } = await supabase
      .from('topic_research')
      .upsert({
        user_id,
        topic_id,
        depth_level: normDepth,
        summary: research.summary,
        key_stats: research.key_stats,
        audience_insights: research.audience_insights,
        competitor_analysis: research.competitor_analysis,
        content_angles: research.content_angles,
        hashtags: research.hashtags,
        sources: research.sources,
        credibility_score: research.credibility_score,
        cached_until: cachedUntil
      })
      .select()
      .single()

    if (saveError) {
      throw new Error(`Failed to save research: ${saveError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        research: savedResearch,
        cached: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Topic research error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function performTopicResearch(topic: any, depth: string) {
  if (!openaiApiKey) {
    // Return mock research data if no OpenAI key
    return generateMockResearch(topic, depth)
  }

  const prompt = `Research the topic "${topic.title}" for content creation purposes. 
  
Topic details:
- Title: ${topic.title}
- Description: ${topic.description || 'No description provided'}
- Keywords: ${topic.keywords?.join(', ') || 'None'}
- Type: ${topic.topic_type || 'General'}

Research depth: ${depth}

Provide a comprehensive research report including:
1. Key statistics and data points
2. Target audience insights
3. Current trends and discussions
4. Content angles and approaches
5. Relevant hashtags
6. Competitor analysis
7. Credibility assessment

Format as JSON with the following structure:
{
  "summary": "Brief overview",
  "key_stats": {"stat1": "value1", "stat2": "value2"},
  "audience_insights": {"demographic": "info", "interests": ["list"]},
  "competitor_analysis": {"top_creators": ["list"], "content_gaps": ["opportunities"]},
  "content_angles": ["angle1", "angle2", "angle3"],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "sources": [{"url": "source1", "credibility": "high"}],
  "credibility_score": 0.85
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a content research specialist. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    })

    const data = await response.json()
    const aiResponse = String(data.choices?.[0]?.message?.content ?? '')

    // Strip Markdown code fences and parse JSON
    const stripFences = (s: string) => {
      const trimmed = s.trim()
      const fenceMatch = trimmed.match(/^```(?:json)?\n([\s\S]*?)\n```$/)
      if (fenceMatch) return fenceMatch[1].trim()
      return trimmed
    }
    const tryParseJson = (s: string) => { try { return JSON.parse(s) } catch { return null } }
    const cleaned = stripFences(aiResponse)
    const parsed = tryParseJson(cleaned) || tryParseJson((cleaned.match(/\{[\s\S]*\}/) || [])[0] || '')
    if (parsed && typeof parsed === 'object') return parsed
    console.error('Failed to parse AI response as JSON, falling back to mock')
    return generateMockResearch(topic, depth)

  } catch (error) {
    console.error('OpenAI API error:', error)
    return generateMockResearch(topic, depth)
  }
}

function generateMockResearch(topic: any, depth: string) {
  const baseResearch = {
    summary: `Research analysis for ${topic.title}. This topic shows strong engagement potential with growing audience interest.`,
    key_stats: {
      "monthly_searches": "12,500",
      "engagement_rate": "4.2%",
      "competition_level": "Medium"
    },
    audience_insights: {
      "primary_demographic": "25-35 years",
      "interests": ["technology", "innovation", "business"],
      "platforms": ["Twitter", "LinkedIn", "YouTube"]
    },
    competitor_analysis: {
      "top_creators": ["@techleader1", "@innovator2"],
      "content_gaps": ["practical tutorials", "case studies"]
    },
    content_angles: [
      "How-to guides and tutorials",
      "Industry insights and predictions",
      "Case study breakdowns"
    ],
    hashtags: topic.keywords?.map((k: string) => `#${k}`) || ["#content", "#research"],
    sources: [
      {"url": "https://example.com/research", "credibility": "high"}
    ],
    credibility_score: 0.75
  }

  if (depth === 'comprehensive') {
    baseResearch.content_angles.push(
      "Expert interviews",
      "Data-driven analysis",
      "Future trend predictions"
    )
    baseResearch.credibility_score = 0.85
  }

  return baseResearch
}
