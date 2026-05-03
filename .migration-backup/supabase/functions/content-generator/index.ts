
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

interface ContentGenerationRequest {
  topic_id?: string
  user_id: string
  platform: string
  content_type: string
  prompt?: string
  research_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { topic_id, user_id, platform, content_type, prompt, research_id }: ContentGenerationRequest = await req.json()

    // Normalize platform and content_type to satisfy DB constraints
    const allowedPlatforms = new Set(['linkedin', 'instagram', 'tiktok', 'twitter'])
    const normalizePlatform = (p: string) => allowedPlatforms.has(p) ? p : 'linkedin'
    const normalizeContentType = (p: string, ct: string) => {
      const allowed = new Set(['text_post', 'carousel', 'reel', 'story'])
      if (allowed.has(ct)) return ct
      if (p === 'instagram') {
        if (ct === 'caption' || ct === 'story') return 'story'
        if (ct === 'reel') return 'reel'
        if (ct === 'carousel') return 'carousel'
      }
      // threads/articles/long_form and others map to text_post
      return 'text_post'
    }

    const normPlatform = normalizePlatform(platform)
    const normContentType = normalizeContentType(normPlatform, content_type)

    console.log(`Generating content for platform: ${normPlatform}, type: ${normContentType}`)

    // Get user profile for voice/style
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single()

    let topic = null
    let research = null

    // Get topic and research data if provided
    if (topic_id) {
      const { data: topicData } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topic_id)
        .eq('user_id', user_id)
        .single()
      topic = topicData
    }

    if (research_id) {
      const { data: researchData } = await supabase
        .from('topic_research')
        .select('*')
        .eq('id', research_id)
        .eq('user_id', user_id)
        .single()
      research = researchData
    }

    // Get user's content samples for style reference
    const { data: samples } = await supabase
      .from('content_samples')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .limit(3)

    // Generate content
    const generatedContent = await generateContent({
      topic,
      research,
      platform: normPlatform,
      content_type: normContentType,
      prompt,
      profile,
      samples
    })

    // Save as draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .insert({
        user_id,
        platform: normPlatform,
        content_type: normContentType,
        title: generatedContent.title,
        content: generatedContent,
        metadata: {
          topic_id,
          research_id,
          generation_prompt: prompt,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (draftError) {
      throw new Error(`Failed to save draft: ${draftError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        draft,
        content: generatedContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Content generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function generateContent(params: any) {
  const { topic, research, platform, content_type, prompt, profile, samples } = params

  if (!openaiApiKey) {
    return generateMockContent(platform, content_type, topic)
  }

  // Build context for AI
  let context = `Generate ${content_type} content for ${platform}.`
  
  if (topic) {
    context += `\n\nTopic: ${topic.title}\nDescription: ${topic.description || ''}`
  }

  if (research) {
    context += `\n\nResearch insights:\n${research.summary}`
    context += `\nContent angles: ${research.content_angles?.join(', ')}`
    context += `\nHashtags: ${research.hashtags?.join(', ')}`
  }

  if (profile) {
    context += `\n\nCreator profile: ${profile.bio || ''}`
    context += `\nIndustry: ${profile.industry || ''}`
    context += `\nCreator type: ${profile.creator_type || ''}`
  }

  if (samples && samples.length > 0) {
    context += `\n\nStyle reference from previous content:\n`
    samples.forEach((sample: any, index: number) => {
      context += `${index + 1}. ${sample.content.substring(0, 200)}...\n`
    })
  }

  if (prompt) {
    context += `\n\nSpecific request: ${prompt}`
  }

  context += `\n\nPlatform requirements for ${platform}:`
  if (platform === 'twitter') {
    context += '\n- Keep under 280 characters\n- Use engaging hooks\n- Include relevant hashtags\n- Be conversational'
  } else if (platform === 'linkedin') {
    context += '\n- Professional tone\n- 1-3 paragraphs\n- Include call-to-action\n- Use industry insights'
  } else if (platform === 'instagram') {
    context += '\n- Visual-first approach\n- Engaging caption\n- Story-driven\n- Include hashtags'
  }

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
          { 
            role: 'system', 
            content: 'You are a professional content creator. Create engaging, platform-optimized content that matches the user\'s voice and style. Return JSON with title, text, hashtags, and call_to_action fields.' 
          },
          { role: 'user', content: context }
        ],
        max_tokens: 1000,
        temperature: 0.8
      }),
    })

    const data = await response.json()
    const aiResponse = String(data.choices?.[0]?.message?.content ?? '')

    // Try to strip Markdown fences and parse JSON when present
    const stripFences = (s: string) => {
      const trimmed = s.trim()
      const fenceMatch = trimmed.match(/^```(?:json)?\n([\s\S]*?)\n```$/)
      if (fenceMatch) return fenceMatch[1].trim()
      return trimmed
    }
    const tryParseJson = (s: string) => {
      try { return JSON.parse(s) } catch { return null }
    }

    const cleaned = stripFences(aiResponse)
    const parsed = tryParseJson(cleaned) || tryParseJson((cleaned.match(/\{[\s\S]*\}/) || [])[0] || '')
    if (parsed && typeof parsed === 'object') {
      return parsed
    }

    // Fallback: plain text without code fences
    return {
      title: topic?.title || 'Generated Content',
      text: cleaned.replace(/^```(?:json)?/i, '').replace(/```$/,''),
      hashtags: research?.hashtags || [],
      call_to_action: 'What do you think?'
    }

  } catch (error) {
    console.error('OpenAI API error:', error)
    return generateMockContent(platform, content_type, topic)
  }
}

function generateMockContent(platform: string, content_type: string, topic: any) {
  const templates = {
    twitter: {
      text_post: `🚀 Diving deep into ${topic?.title || 'this fascinating topic'}! 

The key insight? It's all about understanding the fundamentals and applying them consistently.

What's your experience with this? 

#innovation #insights`,
      thread: `1/3 Let's break down ${topic?.title || 'this concept'} 🧵

The most important thing to understand is...

2/3 Here's what most people get wrong:

3/3 My key takeaway: Focus on the basics first.

What questions do you have?`
    },
    linkedin: {
      text_post: `${topic?.title || 'Industry Insights'}: What I've Learned

After analyzing the latest trends, here are 3 key takeaways:

1. The landscape is rapidly evolving
2. Adaptation is crucial for success  
3. Community engagement drives results

What trends are you seeing in your industry?

#leadership #innovation #growth`,
      article: `# ${topic?.title || 'The Future of Innovation'}

The industry is at a turning point. Here's what forward-thinking leaders need to know...

[Article content would continue with detailed analysis]`
    }
  }

  const platformTemplates = templates[platform as keyof typeof templates] || templates.linkedin
  const contentTemplate = platformTemplates[content_type as keyof typeof platformTemplates] || platformTemplates.text_post

  return {
    title: topic?.title || 'Generated Content',
    text: contentTemplate,
    hashtags: topic?.keywords?.map((k: string) => `#${k}`) || ['#content'],
    call_to_action: 'What are your thoughts?'
  }
}
