
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TrendingUp, Zap, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTopics } from "@/hooks/useTopics";
import { EnhancedTopicCard } from "@/components/intelligence/EnhancedTopicCard";
import { IngestedContentList } from "@/components/content/IngestedContentList";
import { TrendResearchSection } from "@/components/intelligence/TrendResearchSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContentGenerationForm } from "@/components/intelligence/ContentGenerationForm";
import { useTopicResearch, useTopicResearchData } from "@/hooks/useTopicResearch";
import { useAuth } from "@/hooks/useAuth";

const Intelligence = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genTopicId, setGenTopicId] = useState<string | undefined>(undefined);
  const [showTrendingOnly, setShowTrendingOnly] = useState(false);

  const { data: topics = [], isLoading, error } = useTopics(selectedDate);

  const filteredTopics = showTrendingOnly
    ? topics.filter(topic => topic.is_trending)
    : topics;

  const trendingCount = topics.filter(topic => topic.is_trending).length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading topics: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence</h1>
          <p className="text-muted-foreground">
            AI-powered topic analysis and content opportunities
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "All dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => setSelectedDate(date || null)}
                initialFocus
              />
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="w-full"
                >
                  Clear Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Trending Filter */}
          <Button
            variant={showTrendingOnly ? "default" : "outline"}
            onClick={() => setShowTrendingOnly(!showTrendingOnly)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showTrendingOnly ? "All Topics" : "Trending Only"}
          </Button>
        </div>
      </div>

      {/* Trend Research Section - NEW */}
      <TrendResearchSection />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topics.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDate ? `for ${format(selectedDate, "MMM dd")}` : "across all time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending Topics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{trendingCount}</div>
            <p className="text-xs text-muted-foreground">
              High engagement potential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Badge variant="outline" className="text-xs">Score</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topics.length > 0
                ? Math.round((topics.reduce((acc, t) => acc + t.confidence_score, 0) / topics.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Analysis accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Topics Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Analysis</CardTitle>
          <CardDescription>
            {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} found
            {selectedDate && ` for ${format(selectedDate, "MMMM dd, yyyy")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No topics found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedDate
                  ? "No topics were analyzed for the selected date. Try a different date or clear the filter."
                  : "Start by adding content sources to generate topic intelligence."
                }
              </p>
              <Button variant="outline" onClick={() => setSelectedDate(null)}>
                {selectedDate ? "Clear Date Filter" : "Add Sources"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTopics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  onGenerate={(tid: string) => { setGenTopicId(tid); setGenOpen(true); }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Ingested Content */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Ingested Content</CardTitle>
          <CardDescription>Most recent items fetched from your sources</CardDescription>
        </CardHeader>
        <CardContent>
          <IngestedContentList />
        </CardContent>
      </Card>

      {/* Generate Content Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Content</DialogTitle>
          </DialogHeader>
          <ContentGenerationForm
            topicId={genTopicId}
            topicTitle={topics.find(t => t.id === genTopicId)?.title}
            topicDescription={topics.find(t => t.id === genTopicId)?.description}
            onSuccess={() => setGenOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function TopicRow({ topic, onGenerate }: { topic: any; onGenerate: (id: string) => void }) {
  const { user } = useAuth();
  const { conductResearch, isResearching } = useTopicResearch();
  const { data: research } = useTopicResearchData(topic.id, true);

  const handleResearch = (topicId: string) => {
    if (!user?.id) return;
    conductResearch({ topicId, userId: user.id, depthLevel: 'detailed' });
  };

  return (
    <EnhancedTopicCard
      topic={topic}
      research={research || undefined}
      onResearch={handleResearch}
      isResearching={isResearching}
      onGenerate={onGenerate}
    />
  );
}

export default Intelligence;
