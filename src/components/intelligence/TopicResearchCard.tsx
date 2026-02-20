
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Hash, 
  ExternalLink, 
  Wand2 
} from "lucide-react"
import type { TopicResearch } from "@/types/research"

interface Props {
  research: TopicResearch
  onGenerateContent?: (researchId: string) => void
}

export const TopicResearchCard = ({ research, onGenerateContent }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Research Results</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{research.depth_level}</Badge>
            <Badge variant="secondary">
              {Math.round(research.credibility_score * 100)}% credible
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary */}
        {research.summary && (
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{research.summary}</p>
          </div>
        )}

        {/* Key Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" />
            <h4 className="font-medium">Key Statistics</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(research.key_stats).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 bg-muted rounded">
                <span className="text-sm font-medium">{key}</span>
                <span className="text-sm">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <h4 className="font-medium">Audience Insights</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(research.audience_insights).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-sm font-medium capitalize">{key}:</span>
                <span className="text-sm text-muted-foreground">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Angles */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            <h4 className="font-medium">Content Angles</h4>
          </div>
          <ul className="space-y-1">
            {research.content_angles.map((angle, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{angle}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hashtags */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4" />
            <h4 className="font-medium">Recommended Hashtags</h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {research.hashtags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Sources */}
        {research.sources.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="h-4 w-4" />
              <h4 className="font-medium">Sources</h4>
            </div>
            <div className="space-y-2">
              {research.sources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate flex-1"
                  >
                    {source.url}
                  </a>
                  <Badge 
                    variant={source.credibility === 'high' ? 'default' : 'secondary'}
                    className="ml-2 text-xs"
                  >
                    {source.credibility}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />
        
        {/* Generate Content Button */}
        {onGenerateContent && (
          <Button 
            onClick={() => onGenerateContent(research.id)}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Content from Research
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
