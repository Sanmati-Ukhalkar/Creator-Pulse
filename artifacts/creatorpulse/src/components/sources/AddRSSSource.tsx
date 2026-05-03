import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rss, Check, X } from "lucide-react";
import { useSources } from "@/hooks/useSources";

export function AddRSSSource() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<'valid' | 'invalid' | null>(null);
  
  const { createSource, isCreating, validateRSSFeed } = useSources();

  const handleUrlChange = async (value: string) => {
    setUrl(value);
    setValidation(null);
    
    if (value.trim()) {
      setValidating(true);
      const isValid = await validateRSSFeed(value);
      setValidation(isValid ? 'valid' : 'invalid');
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || validation !== 'valid') return;

    createSource({
      source_type: 'rss',
      source_name: name.trim(),
      source_url: url.trim(),
    });

    // Reset form
    setName("");
    setUrl("");
    setValidation(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rss-name">Feed Name</Label>
        <Input
          id="rss-name"
          placeholder="e.g., TechCrunch, Personal Blog"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rss-url">RSS Feed URL</Label>
        <div className="relative">
          <Input
            id="rss-url"
            placeholder="https://example.com/feed.xml"
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            required
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {validating && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            )}
            {validation === 'valid' && (
              <Check className="w-4 h-4 text-green-600" />
            )}
            {validation === 'invalid' && (
              <X className="w-4 h-4 text-red-600" />
            )}
          </div>
        </div>
        {validation === 'invalid' && (
          <p className="text-sm text-destructive">Invalid RSS feed URL</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isCreating || !name.trim() || !url.trim() || validation !== 'valid'}
      >
        <Rss className="h-4 w-4 mr-2" />
        {isCreating ? "Adding..." : "Add RSS Feed"}
      </Button>
    </form>
  );
}