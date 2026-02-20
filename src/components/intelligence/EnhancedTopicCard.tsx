
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TopicScheduleButton } from "./TopicScheduleButton";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Target, 
  Lightbulb,
  BarChart3,
  Hash,
  ExternalLink,
  Sparkles
} from "lucide-react";

interface Topic {
  id: string;
  title: string;
  description?: string;
  confidence_score: number;
  trend_score: number;
  is_trending: boolean;
  keywords: string[];
  topic_type?: string;
  created_at: string;
}

interface TopicResearch {
  summary?: string;
  content_angles: string[];
  hashtags: string[];
  key_stats: {
    engagement_rate?: number;
    potential_reach?: number;
    competition_level?: string;
    trending_duration?: string;
  };
  audience_insights: {
    primary_audience?: string;
    interests?: string[];
    demographics?: any;
  };
  credibility_score: number;
}

interface EnhancedTopicCardProps {
  topic: Topic;
  research?: TopicResearch;
  onResearch?: (topicId: string) => void;
  onGenerate?: (topicId: string) => void;
  isResearching?: boolean;
  isGenerating?: boolean;
}

export function EnhancedTopicCard({
  topic,
  research,
  onResearch,
  onGenerate,
  isResearching = false,
  isGenerating = false
}: EnhancedTopicCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getTopicTypeColor = (type?: string) => {
    const colors = {
      'trending': 'bg-red-100 text-red-800',
      'educational': 'bg-blue-100 text-blue-800',
      'entertainment': 'bg-purple-100 text-purple-800',
      'news': 'bg-green-100 text-green-800',
      'business': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCompetitionColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {topic.is_trending && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-pink-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
          <TrendingUp className="h-3 w-3 inline mr-1" />
          Trending
        </div>
      )}
      
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle className="text-lg leading-tight">{topic.title}</CardTitle>
          {topic.description && (
            <CardDescription className={`${!showFullDescription && topic.description.length > 150 ? 'line-clamp-2' : ''}`}>
              {topic.description}
              {topic.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-primary hover:underline ml-2 text-sm"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </CardDescription>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {topic.topic_type && (
            <Badge className={getTopicTypeColor(topic.topic_type)}>
              {topic.topic_type}
            </Badge>
          )}
          <Badge variant="outline">
            Score: {(topic.confidence_score * 100).toFixed(0)}%
          </Badge>
          {topic.keywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="secondary" className="text-xs">
              #{keyword}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Topic Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Confidence</span>
            </div>
            <Progress value={topic.confidence_score * 100} className="h-2" />
            <span className="text-xs text-muted-foreground mt-1 block">
              {(topic.confidence_score * 100).toFixed(0)}% match
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Trend Score</span>
            </div>
            <Progress value={topic.trend_score} className="h-2" />
            <span className="text-xs text-muted-foreground mt-1 block">
              {topic.trend_score}/100
            </span>
          </div>
        </div>

        {/* Research Data */}
        {research && (
          <>
            <Separator />
            <div className="space-y-4">
              {research.summary && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Summary
                  </h4>
                  <p className="text-sm text-muted-foreground">{research.summary}</p>
                </div>
              )}

              {/* Key Stats */}
              {research.key_stats && Object.keys(research.key_stats).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Key Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {research.key_stats.engagement_rate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Engagement:</span>
                        <span className="font-medium">{research.key_stats.engagement_rate}%</span>
                      </div>
                    )}
                    {research.key_stats.potential_reach && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reach:</span>
                        <span className="font-medium">{research.key_stats.potential_reach.toLocaleString()}</span>
                      </div>
                    )}
                    {research.key_stats.competition_level && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Competition:</span>
                        <span className={`font-medium capitalize ${getCompetitionColor(research.key_stats.competition_level)}`}>
                          {research.key_stats.competition_level}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Angles */}
              {research.content_angles && research.content_angles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Content Angles
                  </h4>
                  <div className="space-y-1">
                    {research.content_angles.slice(0, 3).map((angle, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{angle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {research.hashtags && research.hashtags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {research.hashtags.slice(0, 6).map((hashtag) => (
                      <Badge key={hashtag} variant="outline" className="text-xs">
                        #{hashtag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex flex-wrap gap-2">
          {onResearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResearch(topic.id)}
              disabled={isResearching}
            >
              {isResearching ? "Researching..." : "Research"}
            </Button>
          )}
          
          {onGenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerate(topic.id)}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Content"}
            </Button>
          )}

          <TopicScheduleButton 
            topicId={topic.id}
            topicTitle={topic.title}
          />
        </div>
      </CardContent>
    </Card>
  );
}
