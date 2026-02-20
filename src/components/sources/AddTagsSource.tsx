import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hash } from "lucide-react";
import { useSources } from "@/hooks/useSources";

export function AddTagsSource() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  
  const { createSource, isCreating } = useSources();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tags.trim()) return;

    // Parse tags from textarea
    const tagList = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    createSource({
      source_type: 'tags',
      source_name: name.trim(),
      source_config: {
        tags: tagList,
        keywords: tagList.filter(tag => !tag.startsWith('#')),
        hashtags: tagList.filter(tag => tag.startsWith('#')),
      },
    });

    // Reset form
    setName("");
    setTags("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tags-name">Source Name</Label>
        <Input
          id="tags-name"
          placeholder="e.g., Industry Keywords, Trending Topics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags-list">Keywords and Hashtags</Label>
        <Textarea
          id="tags-list"
          placeholder="Enter keywords and hashtags separated by commas:&#10;#artificialintelligence, #machinelearning, tech startup, innovation"
          rows={4}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Separate keywords with commas. Use # for hashtags.
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isCreating || !name.trim() || !tags.trim()}
      >
        <Hash className="h-4 w-4 mr-2" />
        {isCreating ? "Adding..." : "Add Tag Source"}
      </Button>
    </form>
  );
}