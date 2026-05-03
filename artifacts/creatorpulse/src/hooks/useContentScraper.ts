
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface ScrapeSourceParams {
  sourceId: string
  userId: string
}

interface ImportTweetParams {
  sourceId: string
  userId: string
  url: string
}

export const useContentScraper = () => {
  const queryClient = useQueryClient()

  const scrapeSource = useMutation({
    mutationFn: async ({ sourceId, userId }: ScrapeSourceParams) => {
      console.log('Starting content scrape for source:', sourceId)

      const response = await api.post('/scraper/run', {
        source_id: sourceId,
        user_id: userId
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully scraped ${data.scraped_count} items`)
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      queryClient.invalidateQueries({ queryKey: ['ingested-contents'] })
    },
    onError: (error) => {
      console.error('Scrape mutation error:', error)
      toast.error(`Scraping failed: ${error.message}`)
    }
  })

  const scrapeAllTwitter = useMutation({
    mutationFn: async (userId: string) => {
      // Fetch all twitter sources for user and invoke scraper sequentially
      const { data: sources } = await api.get('/sources');
      const twitterSources = sources.filter((s: any) => s.source_type === 'twitter');

      const results: any[] = []
      for (const s of (twitterSources || [])) {
        const response = await api.post('/scraper/run', {
          source_id: s.id,
          user_id: userId
        });
        results.push(response.data)
      }
      return results
    },
    onSuccess: () => {
      toast.success('Twitter sources queued for scraping')
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      queryClient.invalidateQueries({ queryKey: ['ingested-contents'] })
    },
    onError: (error) => {
      console.error('Bulk scrape error:', error)
      toast.error(`Bulk scrape failed: ${error.message}`)
    }
  })

  const importTweetUrl = useMutation({
    mutationFn: async ({ sourceId, userId, url }: ImportTweetParams) => {
      const response = await api.post('/scraper/import-tweet', {
        source_id: sourceId,
        user_id: userId,
        tweet_url: url
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Imported 1 tweet')
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      queryClient.invalidateQueries({ queryKey: ['ingested-contents'] })
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    }
  })

  return {
    scrapeSource: scrapeSource.mutate,
    scrapeAllTwitter: scrapeAllTwitter.mutate,
    importTweetUrl: importTweetUrl.mutate,
    isImporting: importTweetUrl.isPending,
    isScraping: scrapeSource.isPending,
    scrapeError: scrapeSource.error
  }
}
