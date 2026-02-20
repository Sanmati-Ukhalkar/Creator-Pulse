
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useIngestedContent } from '@/hooks/useIngestedContent'
import { useAuth } from '@/hooks/useAuth'
import { ExternalLink, Calendar, Hash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const IngestedContentList = () => {
  const { user } = useAuth()
  const { data: content, isLoading, error } = useIngestedContent(user?.id)

  if (isLoading) {
    return <div className="p-4 text-center">Loading content...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading content: {error.message}</div>
  }

  if (!content || content.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No content ingested yet.</p>
        <p className="text-sm mt-2">Add sources and sync them to see content here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {content.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2">
                  {item.title || 'Untitled'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {item.sources?.source_type || 'Unknown'}
                  </Badge>
                  <span>•</span>
                  <span>{item.sources?.source_name || 'Unknown Source'}</span>
                </CardDescription>
              </div>
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {item.raw_content && (
                <p className="text-gray-600 text-sm line-clamp-3">
                  {item.raw_content}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {item.published_at 
                        ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
                        : 'Unknown date'
                      }
                    </span>
                  </div>
                  
                  {item.hash && (
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono">{item.hash.slice(0, 8)}</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  variant={item.status === 'processed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
