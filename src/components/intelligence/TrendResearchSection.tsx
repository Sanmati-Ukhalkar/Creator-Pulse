
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TrendingUp, Clock, CheckCircle, XCircle, Loader2, Plus, Zap } from "lucide-react"
import { useTrendResearch, useTrendResearchList, useRealtimeTrendResearch } from "@/hooks/useTrendResearch"
import { format, formatDistanceToNow } from "date-fns"

export const TrendResearchSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [categories, setCategories] = useState("")
  const navigate = useNavigate()

  const { triggerResearch, isTriggering } = useTrendResearch()
  const { data: trendResearch = [], isLoading } = useTrendResearchList()

  // Set up realtime updates
  useRealtimeTrendResearch()

  const handleTriggerResearch = () => {
    if (!title.trim()) return

    const categoryArray = categories
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)

    triggerResearch({
      title: title.trim(),
      categories: categoryArray
    })

    setTitle("")
    setCategories("")
    setIsDialogOpen(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const activeTrend = trendResearch.find(t => t.status === 'pending' || t.status === 'processing')
  const canTrigger = !activeTrend

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend Research
            </CardTitle>
            <CardDescription>
              AI-powered trend analysis to discover content opportunities
            </CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canTrigger || isTriggering}>
                <Plus className="h-4 w-4 mr-2" />
                {activeTrend ? 'Research in Progress' : 'Get Latest Trends'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Trend Research</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Research Topic</label>
                  <Input
                    placeholder="e.g., AI in Marketing, Social Media Trends 2024"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categories (optional)</label>
                  <Input
                    placeholder="e.g., technology, marketing, social media (comma-separated)"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleTriggerResearch}
                  disabled={!title.trim() || isTriggering}
                  className="w-full"
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Research...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Research
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : trendResearch.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No trend research yet</h3>
            <p className="text-muted-foreground mb-4">
              Start your first trend research to discover content opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trendResearch.slice(0, 5).map((trend) => (
              <div key={trend.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(trend.status)}
                    <h4 className="font-medium">{trend.title}</h4>
                    <Badge className={getStatusColor(trend.status)}>
                      {trend.status}
                    </Badge>
                  </div>

                  {trend.categories.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {trend.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Requested {formatDistanceToNow(new Date(trend.requested_at), { addSuffix: true })}
                    {trend.generated_at && (
                      <> • Completed {format(new Date(trend.generated_at), 'MMM dd, HH:mm')}</>
                    )}
                  </div>

                  {trend.error_message && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {trend.error_message}
                    </div>
                  )}
                </div>

                {trend.status === 'completed' && (
                  <div className="text-right">
                    <div className="text-sm font-medium">Score: {trend.priority_score}/10</div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/trends/${trend.id}`)}>
                      Use for Content
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {trendResearch.length > 5 && (
              <>
                <Separator />
                <div className="text-center">
                  <Button variant="ghost" size="sm">
                    View All ({trendResearch.length} total)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
