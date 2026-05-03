import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Twitter, Rss, Hash, Trash2, BarChart } from "lucide-react";
import { SourceSyncButton } from "@/components/sources/SourceSyncButton";
import { AddTwitterSource } from "@/components/sources/AddTwitterSource";
import { AddRSSSource } from "@/components/sources/AddRSSSource";
import { AddTagsSource } from "@/components/sources/AddTagsSource";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useContentScraper } from "@/hooks/useContentScraper";

interface Source {
  id: string;
  source_type: 'twitter' | 'rss' | 'tags';
  source_name: string;
  source_url: string | null;
  source_config: any;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error: string | null;
  metrics: any;
  created_at: string;
}

const Sources = () => {
  const [newSourceType, setNewSourceType] = useState<'twitter' | 'rss' | 'tags'>('twitter');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { importTweetUrl } = useContentScraper();
  const [importFor, setImportFor] = useState<string | null>(null);
  const [tweetUrl, setTweetUrl] = useState("");

  // Fetch sources
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const response = await api.get('/sources');
      return response.data as Source[];
    }
  });

  // Toggle source status
  const toggleSourceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await api.patch(`/sources/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source status updated");
    },
    onError: (error) => {
      toast.error("Failed to update source");
      console.error(error);
    }
  });

  // Delete source
  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete source");
      console.error(error);
    }
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'rss': return <Rss className="h-4 w-4" />;
      case 'tags': return <Hash className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, text: "Pending" },
      syncing: { variant: "default" as const, text: "Syncing" },
      success: { variant: "default" as const, text: "Active" },
      error: { variant: "destructive" as const, text: "Error" }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const handleBulkToggle = (active: boolean) => {
    selectedSources.forEach(id => {
      toggleSourceMutation.mutate({ id, is_active: active });
    });
    setSelectedSources([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
          <p className="text-muted-foreground">
            Manage your content sources and monitor their performance
          </p>
        </div>

        {selectedSources.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggle(false)}
            >
              Pause Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggle(true)}
            >
              Resume Selected
            </Button>
          </div>
        )}
      </div>

      {/* Connected Sources Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Connected Sources
          </CardTitle>
          <CardDescription>
            {sources.length} source{sources.length !== 1 ? 's' : ''} connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No sources connected yet</p>
              <p className="text-sm text-muted-foreground">Add your first source below to start generating content</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div key={source.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSources([...selectedSources, source.id]);
                          } else {
                            setSelectedSources(selectedSources.filter(id => id !== source.id));
                          }
                        }}
                        className="rounded"
                      />

                      <div className="flex items-center gap-2">
                        {getSourceIcon(source.source_type)}
                        <div>
                          <h3 className="font-medium">{source.source_name}</h3>
                          {source.source_url && (
                            <p className="text-sm text-muted-foreground">{source.source_url}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getStatusBadge(source.sync_status)}
                        {source.last_sync_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last sync: {format(new Date(source.last_sync_at), 'MMM dd, HH:mm')}
                          </p>
                        )}
                      </div>

                      <Switch
                        checked={source.is_active}
                        onCheckedChange={(checked) =>
                          toggleSourceMutation.mutate({ id: source.id, is_active: checked })
                        }
                        disabled={toggleSourceMutation.isPending}
                      />

                      <SourceSyncButton
                        sourceId={source.id}
                        syncStatus={source.sync_status}
                      />

                      {source.source_type === 'twitter' && (
                        <Dialog open={importFor === source.id} onOpenChange={(o) => { if (!o) { setImportFor(null); setTweetUrl(""); } }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setImportFor(source.id)}>Import URL</Button>
                          </DialogTrigger>
                          <DialogContent className="overflow-y-auto max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>Import Tweet by URL</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              <Label htmlFor="tweet-url">Tweet URL</Label>
                              <Input id="tweet-url" placeholder="https://twitter.com/username/status/123..." value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} />
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => { setImportFor(null); setTweetUrl(""); }}>Cancel</Button>
                              <Button
                                onClick={() => {
                                  if (user?.id && tweetUrl.trim()) {
                                    importTweetUrl({ sourceId: source.id, userId: user.id, url: tweetUrl.trim() });
                                    setImportFor(null);
                                    setTweetUrl("");
                                  }
                                }}
                                disabled={!user?.id || !tweetUrl.trim()}
                              >
                                Import
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Source</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{source.source_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSourceMutation.mutate(source.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {source.sync_error && (
                    <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      Error: {source.sync_error}
                    </div>
                  )}

                  {/* Metrics */}
                  {source.metrics && Object.keys(source.metrics).length > 0 && (
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      <span>Posts analyzed: {source.metrics.posts_analyzed || 0}</span>
                      <span>Engagement rate: {source.metrics.engagement_rate || 0}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Source Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Source
          </CardTitle>
          <CardDescription>
            Connect new content sources to analyze and generate drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={newSourceType} onValueChange={(v) => setNewSourceType(v as typeof newSourceType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter
              </TabsTrigger>
              <TabsTrigger value="rss" className="flex items-center gap-2">
                <Rss className="h-4 w-4" />
                RSS Feed
              </TabsTrigger>
              <TabsTrigger value="tags" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="twitter" className="space-y-4">
              <AddTwitterSource />
            </TabsContent>

            <TabsContent value="rss" className="space-y-4">
              <AddRSSSource />
            </TabsContent>

            <TabsContent value="tags" className="space-y-4">
              <AddTagsSource />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sources;