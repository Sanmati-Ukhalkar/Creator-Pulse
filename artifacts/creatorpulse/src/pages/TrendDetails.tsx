import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

const TrendDetails = () => {
  const { id } = useParams()
  const { user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ["trend-research", id],
    queryFn: async () => {
      if (!user || !id) return null
      const response = await api.get(`/trends/${id}`);
      return response.data;
    },
    enabled: !!user && !!id
  })

  const renderReport = (researchData: any) => {
    if (!researchData) return null

    // 1) Structured article with content_blocks
    const blocks = researchData.content_blocks || researchData.contentBlocks
    if (Array.isArray(blocks) && blocks.length > 0) {
      const publishedAt: string | null = researchData.publication?.date || null
      let formattedDate = publishedAt
      try {
        if (publishedAt) formattedDate = format(parseISO(publishedAt), 'PPpp')
      } catch { }

      return (
        <div className="space-y-4">
          {researchData.title && (
            <h2 className="text-2xl font-semibold tracking-tight">{researchData.title}</h2>
          )}
          {(researchData.author?.name || researchData.publication?.name || formattedDate) && (
            <div className="text-sm text-muted-foreground">
              {researchData.author?.name ? researchData.author?.name : null}
              {(researchData.author?.name && (researchData.publication?.name || formattedDate)) ? ' • ' : ''}
              {researchData.publication?.name ? researchData.publication?.name : null}
              {(researchData.publication?.name && formattedDate) ? ' • ' : ''}
              {formattedDate || null}
            </div>
          )}
          {researchData.main_image_url && (
            <img src={researchData.main_image_url} alt="cover" className="rounded-lg border" />
          )}
          <div className="space-y-3">
            {blocks.map((b: any, idx: number) => {
              if (!b) return null
              if (b.type === 'heading') {
                const lvl = b.level || 2
                const text = b.text || b.content || ''
                if (lvl <= 2) return <h3 key={idx} className="text-xl font-semibold">{text}</h3>
                if (lvl === 3) return <h4 key={idx} className="text-lg font-semibold">{text}</h4>
                return <h5 key={idx} className="text-base font-semibold">{text}</h5>
              }
              if (b.type === 'paragraph') {
                return <p key={idx} className="leading-7 whitespace-pre-wrap">{b.content}</p>
              }
              return null
            })}
          </div>
        </div>
      )
    }

    // Try common fields first
    const textCandidate =
      researchData.report?.markdown ||
      researchData.report_markdown ||
      researchData.markdown ||
      researchData.summary_markdown ||
      researchData.summary ||
      researchData.text ||
      researchData.content

    if (typeof textCandidate === 'string' && textCandidate.trim().length > 0) {
      return (
        <article className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
          {textCandidate}
        </article>
      )
    }

    // If we have items/articles array, render a list
    const items = researchData.items || researchData.articles || researchData.results
    if (Array.isArray(items) && items.length > 0) {
      return (
        <div className="space-y-4">
          {items.map((it: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base leading-tight">
                  {it.title || it.headline || `Item ${idx + 1}`}
                </h3>
                {typeof it.score === 'number' && (
                  <Badge variant="outline">Score: {it.score}</Badge>
                )}
              </div>
              {it.source && (
                <div className="text-xs text-muted-foreground mb-2">{it.source}</div>
              )}
              {it.url && (
                <a href={it.url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">
                  {it.url}
                </a>
              )}
              {it.summary && (
                <p className="text-sm mt-2 whitespace-pre-wrap">{it.summary}</p>
              )}
            </div>
          ))}
        </div>
      )
    }

    // Fallback to JSON view
    return (
      <pre className="text-sm whitespace-pre-wrap break-words bg-muted p-4 rounded">
        {JSON.stringify(researchData || {}, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trend Details</h1>
          <p className="text-muted-foreground">View and use scraped trend research data</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/intelligence">Back to Intelligence</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data?.title || "Loading..."}</CardTitle>
          <CardDescription>
            Status: {data?.status || "-"} {data?.priority_score ? `• Score: ${data.priority_score}/10` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 bg-muted rounded animate-pulse" />
          ) : error ? (
            <div className="text-destructive">Failed to load trend: {(error as any).message}</div>
          ) : !data ? (
            <div className="text-muted-foreground">No data found.</div>
          ) : (
            <div className="space-y-4">
              {renderReport(data.research_data)}
              <Separator />
              <div className="flex gap-2">
                <Button asChild>
                  <Link to={`/drafts?fromTrend=${data.id}`}>Use in Content Generator</Link>
                </Button>
                {data.n8n_execution_id && (
                  <Badge variant="outline">Exec: {data.n8n_execution_id}</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future: Add "Generate Content" prefilled with this research */}
    </div>
  )
}

export default TrendDetails


