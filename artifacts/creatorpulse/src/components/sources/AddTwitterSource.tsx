import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Twitter } from "lucide-react";
import { useContentScraper } from "@/hooks/useContentScraper";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export function AddTwitterSource() {
  const [tweetUrl, setTweetUrl] = useState("");
  const { user } = useAuth();
  const { importTweetUrl, isImporting } = useContentScraper();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tweetUrl.trim() || !user?.id) return;

    // Find or create a placeholder source for manual tweet imports
    let sourceId: string | null = null;

    try {
      const { data: sources } = await api.get('/sources');
      const existing = sources.find((s: any) =>
        s.source_type === 'twitter' && s.source_name === 'Tweet Imports'
      );
      sourceId = existing?.id || null;

      if (!sourceId) {
        const { data: created } = await api.post('/sources', {
          source_type: 'twitter',
          source_name: 'Tweet Imports',
          source_url: null,
          source_config: { import_mode: 'url' }
        });
        sourceId = created?.id;
      }

      if (sourceId) {
        importTweetUrl({ sourceId, userId: user.id, url: tweetUrl.trim() });
        setTweetUrl("");
      }
    } catch (err) {
      console.error('Error in AddTwitterSource:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <Twitter className="h-8 w-8 mx-auto mb-2 text-blue-500" />
        <h3 className="text-lg font-medium">Import Tweet by URL</h3>
        <p className="text-sm text-muted-foreground">Paste a tweet link to ingest its text.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tweet-url">Tweet URL</Label>
        <Input id="tweet-url" placeholder="https://twitter.com/username/status/123..." value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} required />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!tweetUrl.trim() || !user?.id || isImporting}
      >
        <Twitter className="h-4 w-4 mr-2" />
        {isImporting ? "Importing..." : "Import Tweet"}
      </Button>
    </form>
  );
}