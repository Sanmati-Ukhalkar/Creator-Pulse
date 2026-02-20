
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const twitterBearerToken = Deno.env.get('TWITTER_BEARER_TOKEN') || ''

interface ScrapeRequest {
  source_id: string
  user_id: string
  tweet_url?: string
}

interface ScrapedItem {
  url: string
  title: string
  content: string
  markdown?: string | null
  html?: string | null
  published_at: string
  metadata: any
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let parsedBody: ScrapeRequest | null = null
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    parsedBody = await req.json()
    if (!parsedBody) throw new Error('Invalid request body')
    const { source_id, user_id } = parsedBody as ScrapeRequest

    console.log(`Starting content scrape for source: ${source_id}`)

    // Get source details
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', source_id)
      .eq('user_id', user_id)
      .single()

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`)
    }

    // Update sync status to 'syncing'
    await supabase
      .from('sources')
      .update({ 
        sync_status: 'syncing',
        last_sync_at: new Date().toISOString(),
        sync_error: null
      })
      .eq('id', source_id)

    let scrapedContent: ScrapedItem[] = []

    // Route to appropriate scraper based on source type
    switch (source.source_type) {
      case 'rss':
        scrapedContent = await scrapeRSSFeed(source)
        break
      case 'twitter': {
        if (parsedBody?.tweet_url) {
          scrapedContent = await importTweetByUrl(source, parsedBody.tweet_url)
        } else {
          const tw = await scrapeTwitter(source)
          if (tw.rateLimited) {
            const retryIso = tw.retryAfterISO || null
            await supabase
              .from('sources')
              .update({
                sync_status: 'error',
                sync_error: retryIso ? `Rate limited; retry after ${retryIso}` : 'Rate limited by Twitter API',
                metrics: { ...(source.metrics||{}), retry_after: retryIso }
              })
              .eq('id', source_id)
            scrapedContent = []
          } else {
            scrapedContent = tw.items
            const newestId = scrapedContent[0]?.metadata?.tweet_id
            if (newestId) {
              await supabase
                .from('sources')
                .update({ metrics: { ...(source.metrics||{}), last_tweet_id: newestId } })
                .eq('id', source_id)
            }
          }
        }
        break
      }
      case 'linkedin':
        scrapedContent = await scrapeLinkedIn(source)
        break
      default:
        throw new Error(`Unsupported source type: ${source.source_type}`)
    }

    // Store ingested content (client-side dedupe: avoid requiring a DB unique index)
    const contentInserts = scrapedContent.map(content => ({
      user_id,
      source_id,
      url: content.url,
      title: content.title,
      raw_content: content.content,
      content_md: content.markdown || null,
      content_html: content.html || null,
      hash: generateContentHash(content.content),
      published_at: content.published_at,
      metadata: content.metadata || {},
      status: 'fetched'
    }))
    let insertedContent: any[] = []
    if (contentInserts.length > 0) {
      const hashes = contentInserts.map(ci => ci.hash)
      const { data: existing, error: existingErr } = await supabase
        .from('ingested_contents')
        .select('hash')
        .eq('user_id', user_id)
        .in('hash', hashes)
      if (existingErr) {
        throw new Error(`Failed to check duplicates: ${existingErr.message}`)
      }
      const existingSet = new Set((existing || []).map((r: any) => r.hash))
      const toInsert = contentInserts.filter(ci => !existingSet.has(ci.hash))
      if (toInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('ingested_contents')
          .insert(toInsert)
          .select()
        if (insertError) {
          throw new Error(`Failed to insert content: ${insertError.message}`)
        }
        insertedContent = data || []
      }
    }

    // Update source status to success
    await supabase
      .from('sources')
      .update({ 
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        metrics: {
          ...source.metrics,
          last_scrape_count: scrapedContent.length,
          total_scraped: (source.metrics?.total_scraped || 0) + scrapedContent.length
        }
      })
      .eq('id', source_id)

    // Trigger topic extraction for new content
    if (insertedContent && insertedContent.length > 0) {
      for (const content of insertedContent) {
        // Call topic extractor function
        await fetch(`${supabaseUrl}/functions/v1/llm-topic-extractor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_id: content.id,
            user_id
          })
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped_count: scrapedContent.length,
        inserted_count: insertedContent?.length || 0,
        source_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Content scraper error:', error)

    // Update source with error status
    try {
      if (parsedBody?.source_id) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('sources')
          .update({ 
            sync_status: 'error',
            sync_error: (error as Error).message
          })
          .eq('id', parsedBody.source_id)
      }
    } catch (_) {
      // best-effort; ignore secondary failures
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function scrapeRSSFeed(source: any) {
  const feedUrl = source.source_url
  console.log(`Scraping RSS feed: ${feedUrl}`)

  try {
    const response = await fetch(feedUrl)
    const feedXML = await response.text()
    
    // Parse RSS/Atom feed
    const parser = new DOMParser()
    const doc = parser.parseFromString(feedXML, 'text/xml')
    
    const items: ScrapedItem[] = []
    const entries = doc.querySelectorAll('item, entry')
    
    for (const entry of Array.from(entries).slice(0, 20)) { // Limit to 20 items
      const title = entry.querySelector('title')?.textContent || ''
      const link = entry.querySelector('link')?.textContent || 
                   entry.querySelector('link')?.getAttribute('href') || ''
      const description = entry.querySelector('description, summary, content')?.textContent || ''
      const pubDate = entry.querySelector('pubDate, published, updated')?.textContent || ''
      
      if (title && link && description) {
        items.push({
          url: link,
          title: title.trim(),
          content: description.trim(),
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          metadata: {
            source_type: 'rss',
            feed_url: feedUrl
          }
        })
      }
    }
    
    return items
  } catch (error) {
    console.error('RSS scraping error:', error)
    throw new Error(`Failed to scrape RSS feed: ${error.message}`)
  }
}

async function scrapeTwitter(source: any) {
  try {
    if (!twitterBearerToken) {
      console.warn('Missing TWITTER_BEARER_TOKEN; skipping twitter scrape')
      return { items: [], rateLimited: false }
    }

    const username = source.source_config?.username || source.source_url?.split('/').pop()?.replace('@','')
    if (!username) return { items: [], rateLimited: false }

    // 1) Resolve user ID
    const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
      headers: { 'Authorization': `Bearer ${twitterBearerToken}` }
    })
    if (!userResp.ok) {
      const t = await userResp.text()
      // Non-429 errors: surface but do not crash whole pipeline
      console.error(`Twitter user lookup failed: ${userResp.status} ${t}`)
      return { items: [], rateLimited: userResp.status === 429, retryAfterISO: undefined }
    }
    const userJson = await userResp.json()
    const userId = userJson?.data?.id
    if (!userId) return { items: [], rateLimited: false }

    // 2) Fetch recent tweets (exclude replies and retweets if supported)
    const params = new URLSearchParams({
      max_results: '20',
      'tweet.fields': 'created_at,entities',
      exclude: 'retweets,replies'
    })
    // since_id to reduce rate usage
    const sinceId = source.metrics?.last_tweet_id
    if (sinceId) params.set('since_id', String(sinceId))
    const tlResp = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${twitterBearerToken}` }
    })
    const remaining = tlResp.headers.get('x-rate-limit-remaining')
    const reset = tlResp.headers.get('x-rate-limit-reset')
    if (tlResp.status === 429 || remaining === '0') {
      const retryAfterISO = reset ? new Date(Number(reset) * 1000).toISOString() : undefined
      return { items: [], rateLimited: true, retryAfterISO }
    }
    if (!tlResp.ok) {
      const t = await tlResp.text()
      console.error(`Twitter timeline failed: ${tlResp.status} ${t}`)
      return { items: [], rateLimited: false }
    }
    const tlJson = await tlResp.json()
    const items = (tlJson?.data || []).map((tw: any) => {
      const id = tw.id
      const text = tw.text as string
      const createdAt = tw.created_at || new Date().toISOString()
      const url = `https://twitter.com/${username}/status/${id}`
      return {
        url,
        title: text?.slice(0, 80),
        content: text,
        published_at: new Date(createdAt).toISOString(),
        metadata: {
          source_type: 'twitter',
          tweet_id: id,
          username
        }
      }
    })
    return { items, rateLimited: false }
  } catch (error) {
    console.error('Twitter API error:', error)
    return { items: [], rateLimited: false }
  }
}

async function scrapeLinkedIn(source: any) {
  // LinkedIn scraping would require API integration
  // For now, return mock data structure
  console.log(`LinkedIn scraping not yet implemented for: ${source.source_name}`)
  
  return []
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

async function importTweetByUrl(source: any, tweetUrl: string) {
  try {
    const match = tweetUrl.match(/twitter\.com\/([^/]+)\/status\/(\d+)/i)
    const username = match?.[1]
    const tweetId = match?.[2]

    const resp = await fetch(`https://publish.twitter.com/oembed?omit_script=true&hide_thread=true&url=${encodeURIComponent(tweetUrl)}`)
    if (!resp.ok) {
      const t = await resp.text()
      throw new Error(`Tweet oEmbed failed: ${resp.status} ${t}`)
    }
    const data = await resp.json()
    const text = stripHtml(String(data.html || '')).trim()

    return [{
      url: tweetUrl,
      title: text.slice(0, 80),
      content: text,
      html: data.html || null,
      published_at: new Date().toISOString(),
      metadata: {
        source_type: 'twitter',
        tweet_id: tweetId,
        username,
        imported: true
      }
    }]
  } catch (e) {
    console.error('Import tweet error:', e)
    throw e
  }
}

function generateContentHash(content: string): string {
  // Simple hash function for content deduplication
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
