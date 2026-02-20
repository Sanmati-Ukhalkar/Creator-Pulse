import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Sparkles, Send, Copy, FileEdit } from "lucide-react"
import { useContentGeneration } from "@/hooks/useContentGeneration"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface ContentGenerationFormProps {
  topicId?: string
  topicTitle?: string
  topicDescription?: string
  researchId?: string
  onSuccess?: () => void
  initialPlatform?: string
  initialContentType?: string
}

export const ContentGenerationForm = ({
  topicId,
  topicTitle,
  topicDescription,
  researchId,
  onSuccess,
  initialPlatform,
  initialContentType
}: ContentGenerationFormProps) => {
  const { user } = useAuth()
  const { generateContentAsync, isGenerating } = useContentGeneration()

  const [platform, setPlatform] = useState<string>(initialPlatform || "linkedin")
  const [contentType, setContentType] = useState<string>(initialContentType || "text_post")
  const [prompt, setPrompt] = useState("")

  // Result State
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false)

  const platforms = [
    { value: "linkedin", label: "LinkedIn" },
    // Only LinkedIn supported in backend MVP for now
  ]

  const contentTypes = [
    { value: "text_post", label: "Short Post" },
    { value: "article", label: "Long Article" }
  ]

  const handleGenerate = async () => {
    if (!platform || !contentType) return

    try {
      const result = await generateContentAsync({
        topic: topicTitle || "General Topic",
        description: prompt || topicDescription || "Write a professional post about this topic.",
        platform,
        contentType,
        keywords: [] // TODO: Add keywords input
      })

      if (result?.data?.content) {
        setGeneratedContent(result.data.content);
      }
    } catch (error) {
      // Error handled in hook
    }
  }

  const handlePublish = async () => {
    if (!generatedContent) return;

    setIsPublishing(true);
    try {
      const { data } = await api.post('/publish', {
        content: generatedContent
      });

      toast.success("Published to LinkedIn successfully!");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }

  const handleSaveDraft = () => {
    // TODO: Implement save draft
    toast.info("Draft saved locally (Backend integration pending)");
    if (onSuccess) onSuccess();
  }

  // If content is generated, show the RESULT view
  if (generatedContent) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileEdit className="h-5 w-5 text-creator-violet" />
            Review & Publish
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <Textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm leading-relaxed"
          />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setGeneratedContent(null)}>
              Back
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="bg-[#0077b5] hover:bg-[#006097] text-white">
              {isPublishing ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Otherwise show the FORM view
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          Generate Content
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select
              value={contentType}
              onValueChange={setContentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">
            Custom Instructions
            <span className="text-muted-foreground ml-2 font-normal text-xs">(Optional override)</span>
          </Label>
          <Textarea
            id="prompt"
            placeholder={topicDescription || "Enter context, tone, or specific points to cover..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!platform || !contentType || isGenerating}
          className="w-full bg-creator-gradient text-white hover:opacity-90"
        >
          {isGenerating ? (
            <>
              <Wand2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
