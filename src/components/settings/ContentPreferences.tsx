import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Palette, MessageSquare, FileText, Filter, Save, Plus, X, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ContentPreferences() {
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [keywords, setKeywords] = useState(["AI", "content creation", "social media"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [filterAdult, setFilterAdult] = useState(true);
  const [filterSpam, setFilterSpam] = useState(true);
  
  // Live Data Niche settings
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile');
        if (response.data) {
          setNiche(response.data.niche || "");
          setTargetAudience(response.data.target_audience || "");
          
          if (response.data.settings) {
             if (response.data.settings.tone) setTone(response.data.settings.tone);
             if (response.data.settings.length) setLength(response.data.settings.length);
             if (response.data.settings.keywords) setKeywords(response.data.settings.keywords);
             if (response.data.settings.filterAdult !== undefined) setFilterAdult(response.data.settings.filterAdult);
             if (response.data.settings.filterSpam !== undefined) setFilterSpam(response.data.settings.filterSpam);
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    loadProfile();
  }, []);

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      // 1. Update niche which triggers live data engine
      await api.put('/profile/niche', {
        niche: niche,
        target_audience: targetAudience
      });
      
      // 2. Update general content preferences
      const currentProfileResponse = await api.get('/profile');
      await api.put('/profile', {
        ...currentProfileResponse.data,
        settings: {
          tone,
          length,
          keywords,
          filterAdult,
          filterSpam
        }
      });
      
      toast.success("Preferences saved! Live data engine is generating queries.");
    } catch (e) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <div className="space-y-6">
      {/* Live Data Engine / Niche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Live Data Engine Settings
          </CardTitle>
          <CardDescription>
            Define your niche to automatically pull real-time news, Reddit discussions, and web trends.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="niche">Your Niche / Industry</Label>
            <Input 
              id="niche"
              placeholder="e.g. B2B SaaS Sales, AI in Healthcare, PropTech"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The AI will use this to find the most relevant live events happening in the world today.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input 
              id="targetAudience"
              placeholder="e.g. Startup Founders, Junior Developers"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Draft Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Draft Preferences
          </CardTitle>
          <CardDescription>
            Customize how your content drafts are generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tone Selection */}
            <div className="space-y-2">
              <Label htmlFor="tone">Draft Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-creator-cyan"></div>
                      Professional
                    </div>
                  </SelectItem>
                  <SelectItem value="casual">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-creator-emerald"></div>
                      Casual
                    </div>
                  </SelectItem>
                  <SelectItem value="engaging">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-creator-orange"></div>
                      Engaging
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
              <Label htmlFor="length">Content Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Short (50-100 words)
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Medium (100-200 words)
                    </div>
                  </SelectItem>
                  <SelectItem value="long">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Long (200+ words)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label>Preview Style</Label>
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm">
                {tone === "professional" && "This is a sample of professional tone content that maintains a formal and authoritative voice suitable for business communications."}
                {tone === "casual" && "Hey there! This is how casual tone looks - friendly, approachable, and conversational, perfect for connecting with your audience on a personal level."}
                {tone === "engaging" && "🚀 Ready to dive into engaging content? This tone is dynamic, exciting, and designed to grab attention and spark conversations!"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {tone} tone
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {length} length
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords & Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Keywords & Topics
          </CardTitle>
          <CardDescription>
            Define industry-specific keywords and topics for content generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Keywords */}
          <div className="space-y-3">
            <Label>Industry Keywords</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Add new keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1"
                rows={1}
              />
              <Button onClick={addKeyword} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Keywords List */}
          <div className="space-y-2">
            <Label>Current Keywords</Label>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeKeyword(keyword)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Content Filtering
          </CardTitle>
          <CardDescription>
            Configure content filtering and moderation options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="filter-adult">Filter Adult Content</Label>
              <p className="text-sm text-muted-foreground">
                Automatically filter out inappropriate content
              </p>
            </div>
            <Switch
              id="filter-adult"
              checked={filterAdult}
              onCheckedChange={setFilterAdult}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="filter-spam">Filter Spam Content</Label>
              <p className="text-sm text-muted-foreground">
                Remove low-quality and spam content from sources
              </p>
            </div>
            <Switch
              id="filter-spam"
              checked={filterSpam}
              onCheckedChange={setFilterSpam}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={isSaving} className="bg-creator-gradient hover:bg-creator-gradient-secondary">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}