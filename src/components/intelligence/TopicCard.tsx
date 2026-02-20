import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Flame, Bookmark, Wand2, BookOpen } from "lucide-react";
import type { Topic } from "@/hooks/useTopics";

interface Props {
  topic: Topic;
}

export const TopicCard = ({ topic }: Props) => {
  const onComingSoon = (label: string) => () => toast.info(`${label} coming soon`);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {topic.is_trending && <Flame className="h-4 w-4 text-destructive" />}
            {topic.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {topic.topic_type && <Badge variant="secondary">{topic.topic_type}</Badge>}
            <Badge variant="outline">Trend {topic.trend_score}</Badge>
            <Badge variant="outline">Conf {Math.round(topic.confidence_score)}</Badge>
          </div>
        </div>
        {topic.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {topic.keywords?.slice(0, 6).map((kw) => (
            <Badge key={kw} variant="outline">#{kw}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onComingSoon("Research")}> 
            <BookOpen className="h-4 w-4 mr-2" /> Research
          </Button>
          <Button size="sm" variant="secondary" onClick={onComingSoon("Generate")}> 
            <Wand2 className="h-4 w-4 mr-2" /> Generate
          </Button>
          <Button size="sm" variant="outline" onClick={onComingSoon("Save")}> 
            <Bookmark className="h-4 w-4 mr-2" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};