import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Newspaper } from "lucide-react";
import { useSources } from "@/hooks/useSources";
import { Textarea } from "@/components/ui/textarea";

export function AddNewsApiSource() {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  
  const { createSource, isCreating } = useSources();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keywords.trim()) return;

    const keywordList = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    createSource({
      source_type: 'newsapi',
      source_name: name.trim(),
      source_config: {
        keywords: keywordList,
      },
    });

    setName("");
    setKeywords("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newsapi-name">Source Name</Label>
        <Input
          id="newsapi-name"
          placeholder="e.g., Tech Startup News"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="newsapi-keywords">News Keywords</Label>
        <Textarea
          id="newsapi-keywords"
          placeholder="Enter keywords separated by commas:&#10;artificial intelligence, startups, venture capital"
          rows={3}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Articles matching these keywords will be fetched via NewsAPI.
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isCreating || !name.trim() || !keywords.trim()}
      >
        <Newspaper className="h-4 w-4 mr-2" />
        {isCreating ? "Adding..." : "Add NewsAPI Source"}
      </Button>
    </form>
  );
}
