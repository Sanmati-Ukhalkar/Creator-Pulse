
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutTemplate,
  MoreVertical,
  Trash2,
  ClipboardCopy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Check,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CarouselSlide {
  title: string;
  body: string;
  visual_hint?: string;
}

interface CarouselDraftCardProps {
  draft: {
    id: string;
    title?: string;
    content: any;
    metadata: any;
    status: string;
    created_at: string;
    updated_at: string;
  };
  onDelete: () => void;
}

export function CarouselDraftCard({ draft, onDelete }: CarouselDraftCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Parse slides — content may be { slides: [...] } or string
  const parseSlides = (): CarouselSlide[] => {
    try {
      const raw =
        typeof draft.content === "string"
          ? JSON.parse(draft.content)
          : draft.content;
      return Array.isArray(raw?.slides) ? raw.slides : [];
    } catch {
      return [];
    }
  };

  const slides = parseSlides();
  const meta = draft.metadata || {};
  const jobId = meta.carousel_job_id;
  const topic = draft.title || "Untitled Carousel";
  const slideCount = slides.length;

  // ── Copy all slide text to clipboard ──────────────────────────────────────
  const handleCopy = async () => {
    const text = slides
      .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.body}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("All slide text copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Delete draft ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/drafts/${draft.id}`);
      toast.success("Carousel draft deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete draft");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  // ── Post to LinkedIn (text summary) ───────────────────────────────────────
  const handlePost = async () => {
    if (slides.length === 0) {
      toast.error("No slide content to post");
      return;
    }
    setIsPosting(true);
    try {
      const summaryText = slides
        .map((s, i) => `📌 Slide ${i + 1}: ${s.title}\n${s.body}`)
        .join("\n\n");
      await api.post("/publish", {
        content: summaryText,
        draft_id: draft.id,
      });
      toast.success("Posted to LinkedIn successfully!");
    } catch (e: any) {
      toast.error(
        e.response?.data?.error || "Failed to post. Check LinkedIn connection."
      );
    } finally {
      setIsPosting(false);
    }
  };

  // ── Re-open in Carousel Engine ────────────────────────────────────────────
  const handleReopen = () => {
    if (jobId) {
      navigate(`/carousel?jobId=${jobId}`);
    } else {
      navigate("/carousel");
    }
  };

  const statusColor =
    draft.status === "draft"
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : draft.status === "published"
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <>
      <Card className="group border border-primary/10 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        <CardHeader className="pb-3">
          {/* ── Top row: icon + title + badges + menu ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LayoutTemplate className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate leading-tight">
                  {topic}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(draft.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-medium"
              >
                🎠 Carousel
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 capitalize font-medium ${statusColor}`}
              >
                {draft.status}
              </Badge>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopy}>
                    {copied ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                    )}
                    Copy All Slide Text
                  </DropdownMenuItem>
                  {jobId && (
                    <DropdownMenuItem onClick={handleReopen}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Re-open in Carousel Engine
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* ── Slide count + expand button ── */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-muted/50"
          >
            <span className="font-medium">
              {slideCount} slide{slideCount !== 1 ? "s" : ""}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {/* ── Slide list (expandable) ── */}
          {expanded && slides.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              {slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-snug text-foreground">
                      {slide.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {slide.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty slides ── */}
          {expanded && slides.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-3">
              No slide data available
            </p>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handlePost}
              disabled={isPosting || slides.length === 0}
              className="flex-1 bg-[#0077b5] hover:bg-[#006397] text-white text-xs h-8"
            >
              <Send className="h-3 w-3 mr-1.5" />
              {isPosting ? "Posting…" : "Post to LinkedIn"}
            </Button>
            {jobId && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReopen}
                className="text-xs h-8 px-3 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                View
              </Button>
            )}
            {meta.export_pdf_path && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:4000";
                  const token = localStorage.getItem('auth_token');
                  window.open(`${BACKEND}/api/carousel/${jobId}/asset/${meta.export_pdf_path}?token=${token}`, '_blank');
                }}
                className="text-xs h-8 px-3 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <FileText className="h-3 w-3 mr-1.5" />
                PDF
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-xs h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Carousel Draft?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{topic}" and all its slide data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
