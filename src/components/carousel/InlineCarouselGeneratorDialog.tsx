
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  LayoutTemplate,
  Sparkles,
  CheckCircle2,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCcw,
  Archive,
  ExternalLink,
  FileText,
  Brain,
  Layers,
  Wand2,
  Timer,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// ── Carousel Generation Steps ────────────────────────────────────────────────
const STEPS = [
  { id: "queued",     label: "Job queued",            icon: Timer,        pct: 10 },
  { id: "generating",label: "AI writing slides",      icon: Brain,        pct: 50 },
  { id: "enhancing", label: "Enhancing content",      icon: Wand2,        pct: 75 },
  { id: "designing", label: "Designing layouts",      icon: Layers,       pct: 90 },
  { id: "done",      label: "Done!",                  icon: CheckCircle2, pct: 100 },
];

function ProcessingLoader({ status }: { status: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const currentIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.id === status)
  );
  const currentStep = STEPS[Math.min(currentIdx, STEPS.length - 2)]; // clamp before done
  const pct = currentStep?.pct ?? 10;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center py-10 gap-6 w-full">
      {/* Spinning icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <LayoutTemplate className="h-9 w-9 text-primary" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-background border-2 border-border flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      </div>

      {/* Status + timer */}
      <div className="text-center space-y-1.5">
        <p className="text-base font-semibold">{currentStep?.label ?? "Processing…"}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>{fmt(elapsed)} elapsed</span>
          <span className="text-border">·</span>
          <span>~15–60s total</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>{pct}% complete</span>
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-3 flex-wrap justify-center max-w-sm">
        {STEPS.slice(0, -1).map((step, i) => {
          const Icon = step.icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-all ${
                done
                  ? "bg-green-500/15 border-green-500/30 text-green-400"
                  : active
                  ? "bg-primary/15 border-primary/30 text-primary animate-pulse"
                  : "bg-muted/30 border-border/50 text-muted-foreground/50"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className={`h-3 w-3 ${active ? "animate-spin" : ""}`} />
              )}
              {step.label}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        Don't close this window — your carousel is being built ✨
      </p>
    </div>
  );
}



// ── Types ─────────────────────────────────────────────────────────────────────
interface Slide {
  id: string;
  title: string;
  body: string;
  visual_hint?: string;
  slide_type?: string;
  slide_order?: number;
}

type JobStatus = "idle" | "submitting" | "queued" | "generating" | "done" | "failed";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The post text to convert — full content of the draft/generated post */
  sourceText: string;
  /** Title / topic to label the carousel draft */
  topic?: string;
  /** Optional draft ID to link the carousel back to */
  sourceDraftId?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BACKEND = "http://localhost:4000";
const getAuthToken = () => localStorage.getItem("auth_token") || "";

// ── Component ─────────────────────────────────────────────────────────────────
export function InlineCarouselGeneratorDialog({
  open,
  onOpenChange,
  sourceText,
  topic = "LinkedIn Carousel",
  sourceDraftId,
}: Props) {
  const navigate = useNavigate();

  // Settings
  const [slideCount, setSlideCount] = useState("6");
  const [template, setTemplate] = useState("dark_modern");

  // Job tracking
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [exportsReady, setExportsReady] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Draft saving
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Expanded slides
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  // Prevent double-save per job
  const savedJobRef = useRef<string | null>(null);

  // Reset when dialog opens fresh
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setJobId(null);
      setSlides([]);
      setExportsReady(null);
      setErrorMsg(null);
      setSavedDraftId(null);
      setExpandedSlide(null);
      savedJobRef.current = null;
    }
  }, [open]);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!sourceText?.trim()) {
      toast.error("No post content found — write or generate a post first.");
      return;
    }
    setStatus("submitting");
    setErrorMsg(null);
    setSlides([]);
    setExportsReady(null);
    setSavedDraftId(null);
    savedJobRef.current = null;

    try {
      const response = await api.post("/carousel/generate-smart", {
        source_text: sourceText.trim(),
        slide_count: parseInt(slideCount, 10),
        template,
        idempotency_key: `smart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      const newJobId = response.data?.jobId;
      if (!newJobId) throw new Error("No job ID returned from API");

      setJobId(newJobId);
      setStatus("queued");
      toast.success("Carousel generation started!");
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || "Failed to start carousel generation";
      setErrorMsg(msg);
      setStatus("failed");
      toast.error(msg);
    }
  };

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || status === "done" || status === "failed" || !open) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/carousel/${jobId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const newStatus: JobStatus = data.job?.status;
        setStatus(newStatus);

        if (newStatus === "done") {
          const fetchedSlides: Slide[] = data.slides || [];
          setSlides(fetchedSlides);
          setExportsReady(data.exports || null);
          clearInterval(interval);

          // Auto-save to drafts once per job
          if (savedJobRef.current !== jobId) {
            savedJobRef.current = jobId;
            autoSaveDraft(jobId, fetchedSlides, data.exports);
          }
        } else if (newStatus === "failed") {
          setErrorMsg("AI pipeline failed. Please try again.");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Carousel polling error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, status, open]);

  // ── Auto-save as Draft ─────────────────────────────────────────────────────
  const autoSaveDraft = async (jId: string, fetchedSlides: Slide[], exports: any) => {
    setIsSavingDraft(true);
    try {
      const response = await api.post("/drafts", {
        platform: "linkedin",
        content_type: "carousel",
        title: topic || "LinkedIn Carousel",
        status: "draft",
        content: JSON.stringify({ slides: fetchedSlides }),
        metadata: JSON.stringify({
          carousel_job_id: jId,
          slide_count: fetchedSlides.length,
          source_draft_id: sourceDraftId || null,
          export_pdf_path: exports?.pdf_storage_path || null,
          export_zip_path: exports?.zip_storage_path || null,
          generated_at: new Date().toISOString(),
        }),
      });
      setSavedDraftId(response.data?.id);
      toast.success("Carousel saved to Drafts!", {
        action: { label: "View Drafts", onClick: () => navigate("/drafts") },
        duration: 6000,
      });
    } catch {
      toast.error("Generated successfully but couldn't auto-save to Drafts.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── Status helpers ─────────────────────────────────────────────────────────
  const isProcessing = status === "submitting" || status === "queued" || status === "generating";

  const statusLabel = () => {
    switch (status) {
      case "submitting":  return "Submitting job…";
      case "queued":      return "Queued — waiting for AI worker…";
      case "generating":  return "AI is generating your slides…";
      default:            return "";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0"
        onInteractOutside={(e) => {
          // Prevent accidental close while generating
          if (isProcessing) e.preventDefault();
        }}
      >
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <LayoutTemplate className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Turn into Carousel</DialogTitle>
                <DialogDescription className="text-xs mt-0.5 line-clamp-1">
                  {topic || "LinkedIn Carousel"}
                </DialogDescription>
              </div>
            </div>
            {/* Status badge */}
            {status !== "idle" && (
              <Badge
                className={`text-[10px] px-2.5 py-1 font-medium ${
                  status === "done"
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : status === "failed"
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-primary/15 text-primary border-primary/30"
                }`}
                variant="outline"
              >
                {status === "done" ? "✓ Done" : status === "failed" ? "✗ Failed" : statusLabel()}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* ── Settings (only when idle/failed) ── */}
          {(status === "idle" || status === "failed") && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Slide Count</Label>
                  <Select value={slideCount} onValueChange={setSlideCount}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["4", "5", "6", "7", "8", "9", "10"].map((n) => (
                        <SelectItem key={n} value={n}>{n} Slides</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Template Style</Label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark_modern">Dark Modern</SelectItem>
                      <SelectItem value="light_clean">Light Clean</SelectItem>
                      <SelectItem value="gradient_bold">Gradient Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Source preview */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Source Post (preview)</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {sourceText?.slice(0, 280)}{sourceText?.length > 280 ? "…" : ""}
                </p>
              </div>

              {errorMsg && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="flex-1 bg-creator-violet hover:bg-creator-violet/90 text-white"
                  disabled={!sourceText?.trim()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {slideCount} Slides
                </Button>
              </div>
            </div>
          )}

          {/* ── Processing state ── */}
          {isProcessing && (
            <ProcessingLoader status={status} />
          )}

          {/* ── Done: Slides + export ── */}
          {status === "done" && slides.length > 0 && (
            <div className="space-y-5">
              {/* Saved banner */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
                savedDraftId
                  ? "bg-green-500/10 border-green-500/25 text-green-400"
                  : isSavingDraft
                  ? "bg-muted/40 border-border text-muted-foreground"
                  : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
              }`}>
                <div className="flex items-center gap-2">
                  {isSavingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedDraftId ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <BookmarkCheck className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium">
                    {isSavingDraft ? "Saving to Drafts…" : savedDraftId ? "Saved to Drafts" : "Could not auto-save"}
                  </span>
                </div>
                {savedDraftId && (
                  <button
                    onClick={() => { onOpenChange(false); navigate("/drafts"); }}
                    className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    View in Drafts →
                  </button>
                )}
              </div>

              {/* Slide count summary */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span>Your Slides</span>
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
                    {slides.length} slides
                  </Badge>
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-7"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {/* Slides list */}
              <div className="space-y-2">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="border border-border/60 rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedSlide(expandedSlide === idx ? null : idx)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{slide.title}</p>
                        {slide.slide_type && (
                          <span className="text-[10px] text-muted-foreground capitalize">{slide.slide_type}</span>
                        )}
                      </div>
                      {expandedSlide === idx ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {expandedSlide === idx && (
                      <div className="px-4 pb-4 border-t border-border/40 bg-muted/20 space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <p className="text-xs text-muted-foreground leading-relaxed pt-3">
                          {slide.body}
                        </p>
                        {slide.visual_hint && (
                          <p className="text-[10px] text-primary/60 italic border-t border-border/30 pt-2">
                            🎨 {slide.visual_hint}
                          </p>
                        )}
                        {/* Visual Slide Preview exactly matching PDF */}
                        <div 
                          className="w-full aspect-square rounded-lg mt-4 shadow-inner relative overflow-hidden flex flex-col justify-start text-left"
                          style={{ backgroundColor: '#1E1E2E', padding: '6%' }}
                        >
                          {/* Page Number */}
                          <div 
                            className="absolute top-0 right-0 font-medium"
                            style={{ color: '#6C7086', fontSize: 'clamp(10px, 3cqw, 16px)' }}
                          >
                            {idx + 1} / {slides.length}
                          </div>
                          
                          {/* Title */}
                          <div 
                            className="font-bold tracking-tight mt-[12%]"
                            style={{ 
                              color: '#F5E0DC', 
                              fontSize: 'clamp(14px, 5cqw, 32px)',
                              lineHeight: '1.2',
                              width: '90%'
                            }}
                          >
                            {slide.title}
                          </div>
                          
                          {/* Body */}
                          <div 
                            className="mt-[6%] font-medium"
                            style={{ 
                              color: '#CDD6F4', 
                              fontSize: 'clamp(10px, 3.5cqw, 20px)',
                              lineHeight: '1.4',
                              width: '90%'
                            }}
                          >
                            {slide.body}
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Export buttons */}
              {exportsReady && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground font-medium">Export Assets</p>
                  <div className="flex gap-2">
                    {exportsReady.zip_storage_path && (
                      <a
                        href={`${BACKEND}/api/carousel/${jobId}/asset/${exportsReady.zip_storage_path}?token=${getAuthToken()}`}
                        download
                      >
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                          <Archive className="h-3.5 w-3.5" />
                          ZIP
                        </Button>
                      </a>
                    )}
                    {exportsReady.pdf_storage_path && (
                      <a
                        href={`${BACKEND}/api/carousel/${jobId}/asset/${exportsReady.pdf_storage_path}?token=${getAuthToken()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {savedDraftId && (
                  <Button
                    onClick={() => { onOpenChange(false); navigate("/drafts"); }}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    <BookmarkCheck className="mr-2 h-4 w-4" />
                    Go to Drafts
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Failed state ── */}
          {status === "failed" && errorMsg && (
            <div className="space-y-4">
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <X className="h-5 w-5 mx-auto mb-2 opacity-70" />
                {errorMsg}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
