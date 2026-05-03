import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid URL format" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch the RSS feed
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CreatorPulse-RSS-Validator/1.0',
        },
        // Set a timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: `HTTP ${response.status}: ${response.statusText}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check if it's XML content
      if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
        // Check if the content itself looks like XML
        if (!text.trim().startsWith('<?xml') && !text.includes('<rss') && !text.includes('<feed')) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: "Content does not appear to be a valid RSS/XML feed" 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Basic XML parsing check
      try {
        // Simple check for RSS/Atom elements
        const hasRss = text.includes('<rss') || text.includes('<RSS');
        const hasAtom = text.includes('<feed') || text.includes('<FEED');
        const hasChannel = text.includes('<channel') || text.includes('<CHANNEL');
        const hasItems = text.includes('<item') || text.includes('<entry');

        if (!hasRss && !hasAtom) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: "Not a valid RSS or Atom feed" 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Extract feed info if possible
        let feedTitle = '';
        let feedDescription = '';
        
        const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) {
          feedTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        }

        const descMatch = text.match(/<description[^>]*>(.*?)<\/description>/i);
        if (descMatch) {
          feedDescription = descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        }

        return new Response(
          JSON.stringify({ 
            valid: true, 
            feedInfo: {
              title: feedTitle,
              description: feedDescription,
              hasItems: hasItems,
              type: hasRss ? 'RSS' : 'Atom'
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (parseError) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Failed to parse XML content" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } catch (fetchError) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Failed to fetch feed: ${fetchError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in validate-rss function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});