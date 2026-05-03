
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useContentScraper } from '@/hooks/useContentScraper'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface SourceSyncButtonProps {
  sourceId: string
  syncStatus: string
  className?: string
}

export const SourceSyncButton = ({ sourceId, syncStatus, className }: SourceSyncButtonProps) => {
  const { user } = useAuth()
  const { scrapeSource, isScraping } = useContentScraper()

  const handleSync = () => {
    if (user?.id) {
      scrapeSource({
        sourceId,
        userId: user.id
      })
    }
  }

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'completed':
        return 'text-green-600'
      case 'syncing':
        return 'text-blue-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isScraping || syncStatus === 'syncing'}
      variant="outline"
      size="sm"
      className={cn(className)}
    >
      {(isScraping || syncStatus === 'syncing') ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : syncStatus === 'failed' ? (
        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      <span className={getStatusColor()}>
        {syncStatus === 'syncing' || isScraping ? 'Syncing...' : 
         syncStatus === 'failed' ? 'Retry' : 'Sync'}
      </span>
    </Button>
  )
}
