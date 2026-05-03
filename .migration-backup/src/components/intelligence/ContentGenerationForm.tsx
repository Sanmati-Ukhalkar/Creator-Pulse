import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2,
  Sparkles,
  Send,
  Copy,
  FileEdit,
  Check,
  ChevronRight,
} from "lucide-react";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ContentGenerationFormProps {
  topicId?: string;
  topicTitle?: string;
  topicDescription?: string;
  researchId?: string;
  onSuccess?: () => void;
  initialPlatform?: string;
  initialContentType?: string;
}

export const ContentGenerationForm = ({
  topicId,
  topicTitle,
  topicDescription,
  researchId,
  onSuccess,
  initialPlatform,
  initialContentType,
}: ContentGenerationFormProps) => {
  const { user } = useAuth();
  const {
    generateContentAsync,
    generateHooksAsync,
    isGenerating,
    isGeneratingHooks,
  } = useContentGeneration();

  const [platform, setPlatform] = useState<string>(
    initialPlatform || "linkedin",
  );
  const [contentType, setContentType] = useState<string>(
    initialContentType || "text_post",
  );
  const [prompt, setPrompt] = useState("");

  // Pipeline State
  const [step, setStep] = useState<"setup" | "hooks" | "result">("setup");

  // Hook Selection State
  const [generatedHooks, setGeneratedHooks] = useState<any[]>([]);
  const [selectedHookText, setSelectedHookText] = useState<string | null>(null);

  // Result State
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedDraftId, setGeneratedDraftId] = useState<string | null>(null);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);

  const platforms = [
    { value: "linkedin", label: "LinkedIn" },
    // Only LinkedIn supported in backend MVP for now
  ];

  const contentTypes = [
    { value: "text_post", label: "Short Post" },
    { value: "article", label: "Long Article" },
  ];

  const handleGenerateHooks = async () => {
    if (!platform || !contentType) return;

    try {
      const result = await generateHooksAsync({
        topic: topicTitle || "General Topic",
        description:
          topicDescription || "Write a professional post about this topic.",
        angle: prompt,
        voiceSamples: [], // Could be passed in if we load user profile
      });

      if (result?.data?.hooks && result.data.hooks.length > 0) {
        setGeneratedHooks(result.data.hooks);
        setStep("hooks");
      }
    } catch (error) {
      // Handled in hook
    }
  };

  const handleGenerateFullPost = async () => {
    if (!selectedHookText) return;

    try {
      const result = await generateContentAsync({
        topic: topicTitle || "General Topic",
        description:
          prompt ||
          topicDescription ||
          "Write a professional post about this topic.",
        platform,
        contentType,
        hookText: selectedHookText,
        keywords: [],
      });

      if (result?.data?.content) {
        setGeneratedContent(result.data.content);
        setGeneratedDraftId(result.data.draft_id);
        setStep("result");
      }
    } catch (error) {
      // Handled in hook
    }
  };

  const handlePublish = async () => {
    if (!generatedContent) return;

    setIsPublishing(true);
    try {
      const { data } = await api.post("/publish", {
        content: generatedContent,
        draft_id: generatedDraftId,
      });

      toast.success("Published to LinkedIn successfully!");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    // Backend API already saved it implicitly during generation (draftId returned)
    // We just dismiss the modal to let the user see it in Drafts
    toast.success("Saved to your Drafts!");
    if (onSuccess) onSuccess();
  };

  // If content is generated, show the RESULT view
  if (step === "result" && generatedContent) {
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
            <Button variant="outline" onClick={() => setStep("hooks")}>
              Back to Hooks
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-[#0077b5] hover:bg-[#006097] text-white"
            >
              {isPublishing ? (
                <Wand2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Publish Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the HOOK SELECTION view
  if (step === "hooks" && generatedHooks.length > 0) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Select Your Hook
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The first sentence makes or breaks your post. Choose the hook that
            grabs the most attention.
          </p>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="grid gap-3">
            {generatedHooks.map((h: any, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedHookText(h.hook)}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedHookText === h.hook ? "border-creator-violet bg-creator-violet/5 ring-1 ring-creator-violet" : "border-border hover:border-muted-foreground"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-foreground text-sm flex-1 pr-4">
                    "{h.hook}"
                  </p>
                  {selectedHookText === h.hook && (
                    <Check className="h-5 w-5 text-creator-violet shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Why it works: {h.reasoning}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button variant="ghost" onClick={() => setStep("setup")}>
              Back
            </Button>
            <Button
              onClick={handleGenerateFullPost}
              disabled={!selectedHookText || isGenerating}
              className="bg-creator-gradient text-white hover:opacity-90"
            >
              {isGenerating ? (
                <Wand2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileEdit className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Drafting Post..." : "Write Full Post"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((ct) => (
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
            <span className="text-muted-foreground ml-2 font-normal text-xs">
              (Optional override)
            </span>
          </Label>
          <Textarea
            id="prompt"
            placeholder={
              topicDescription ||
              "Enter context, tone, or specific points to cover..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <Button
          onClick={handleGenerateHooks}
          disabled={!platform || !contentType || isGeneratingHooks}
          className="w-full bg-creator-gradient text-white hover:opacity-90"
        >
          {isGeneratingHooks ? (
            <>
              <Wand2 className="h-4 w-4 mr-2 animate-spin" />
              Brainstorming Hooks...
            </>
          ) : (
            <>
              Generate Hooks
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
