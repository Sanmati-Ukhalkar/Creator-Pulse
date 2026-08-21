import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ImageIcon,
  RefreshCw,
  Wand2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "pollinations" | "gemini";

interface PostImagePanelProps {
  postText: string;
  topic: string;
  draftId?: string | null;
  /** Called when an image is generated successfully */
  onImageGenerated?: (imageB64: string, format: string) => void;
}

interface GeneratedImage {
  image_b64: string;
  format: string;
  provider: string;
  prompt_used: string;
  processing_time_ms: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PostImagePanel({
  postText,
  topic,
  draftId,
  onImageGenerated,
}: PostImagePanelProps) {
  const [provider, setProvider] = useState<Provider>("pollinations");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [seed, setSeed] = useState(42);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const canGenerate = postText && postText.trim().length >= 10;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);

    try {
      const { data } = await api.post("/generate-image", {
        post_text: postText.trim(),
        topic,
        provider,
        seed,
        draft_id: draftId ?? undefined,
      });

      const result: GeneratedImage = data.data;
      setGeneratedImage(result);
      onImageGenerated?.(result.image_b64, result.format);
      toast.success(
        `Image generated with ${provider === "pollinations" ? "Pollinations (Flux)" : "Gemini"} in ${(result.processing_time_ms / 1000).toFixed(1)}s`
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.details ||
        err.response?.data?.error ||
        "Image generation failed. Try again.";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [postText, topic, provider, seed, draftId, canGenerate, onImageGenerated]);

  const handleRegenerate = () => {
    // Change seed to get a different Pollinations variation
    setSeed((prev) => prev + 1);
    handleGenerate();
  };

  const copyPrompt = async () => {
    if (!generatedImage?.prompt_used) return;
    await navigator.clipboard.writeText(generatedImage.prompt_used);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-creator-violet" />
          <span className="text-sm font-semibold">AI Image for Post</span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium">
            FREE
          </span>
        </div>

        {/* Provider Toggle */}
        <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5">
          <button
            onClick={() => setProvider("pollinations")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              provider === "pollinations"
                ? "bg-creator-violet text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3 w-3" />
            Pollinations
          </button>
          <button
            onClick={() => setProvider("gemini")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              provider === "gemini"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            Gemini
          </button>
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────── */}
      <div className="p-4 space-y-4">
        {/* Provider info line */}
        <p className="text-xs text-muted-foreground">
          {provider === "pollinations"
            ? "✅ No API key needed — powered by Flux AI. Perfect for instant generation."
            : "✅ Google Gemini 2.5 Flash — requires GEMINI_API_KEY in AI service .env"}
        </p>

        {/* Image Preview or Placeholder */}
        {generatedImage ? (
          <div className="space-y-3">
            {/* Image — LinkedIn 1.91:1 ratio */}
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-[1.91/1] w-full">
              <img
                src={`data:image/${generatedImage.format};base64,${generatedImage.image_b64}`}
                alt="AI generated banner for post"
                className="w-full h-full object-cover"
              />
              {/* Provider badge overlay */}
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                {generatedImage.provider === "pollinations" ? "⚡ Flux" : "✨ Gemini"}
              </div>
            </div>

            {/* Prompt reveal */}
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPrompt ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showPrompt ? "Hide" : "Show"} prompt used
            </button>

            {showPrompt && (
              <div className="relative bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed border">
                <p className="pr-8">{generatedImage.prompt_used}</p>
                <button
                  onClick={copyPrompt}
                  className="absolute top-2 right-2 p-1 hover:bg-muted rounded transition-colors"
                  title="Copy prompt"
                >
                  {copiedPrompt ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <Wand2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isGenerating ? "Generating…" : "Regenerate Variation"}
              </Button>
            </div>

            {draftId && (
              <p className="text-[10px] text-emerald-500 text-center">
                ✓ Image saved to draft
              </p>
            )}
          </div>
        ) : (
          /* ─── Empty State / Generate Button ──────────── */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-2xl bg-creator-violet/10 border border-creator-violet/20 flex items-center justify-center">
              <ImageIcon className="h-7 w-7 text-creator-violet/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Generate a banner image</p>
              <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                AI reads your post and creates a professional LinkedIn banner (1216×832px)
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="bg-creator-gradient text-white hover:opacity-90 px-6"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating image…
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-muted-foreground">
                Write the post first, then generate an image.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
