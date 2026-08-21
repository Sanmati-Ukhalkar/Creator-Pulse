
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  FileText,
  Archive,
  ExternalLink,
  LayoutTemplate,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  title: string;
  body: string;
  visual_hint?: string;
  slide_type?: string;
  slide_order?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAuthToken = () => localStorage.getItem('auth_token') || '';
const BACKEND = 'http://localhost:4000';

// ── Component ─────────────────────────────────────────────────────────────────

export default function CarouselPage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [exportsReady, setExportsReady] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Track if we already saved this job to drafts (prevent double-save)
  const savedJobIdRef = useRef<string | null>(null);

  // ── Read URL params on mount ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlJobId = params.get('jobId');
    const urlTopic = params.get('topic');

    if (urlJobId) {
      setJobId(urlJobId);
      setStatus('queued');
      setTopic('Generating Smart Carousel…');
    } else if (urlTopic) {
      setTopic(decodeURIComponent(urlTopic));
    }
  }, []);

  // ── Generate carousel ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setStatus('submitting');
    setError(null);
    setSlides([]);
    setExportsReady(null);
    setSavedDraftId(null);
    savedJobIdRef.current = null;

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`${BACKEND}/api/carousel/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ topic: topic.trim(), idempotency_key: idempotencyKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate carousel');

      setJobId(data.jobId);
      setStatus('queued');
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
    }
  };

  // ── Poll for status ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || status === 'done' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/carousel/${jobId}`, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const newStatus = data.job?.status;
        setStatus(newStatus);

        if (newStatus === 'done') {
          const fetchedSlides: Slide[] = data.slides || [];
          setSlides(fetchedSlides);
          setExportsReady(data.exports || null);
          clearInterval(interval);

          // Auto-save to Drafts (once per job)
          if (savedJobIdRef.current !== jobId) {
            savedJobIdRef.current = jobId;
            autoSaveToDraft(jobId, topic, fetchedSlides, data.exports);
          }
        } else if (newStatus === 'failed') {
          setError('Generation failed inside the pipeline. Please try again.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, status]);

  // ── Auto-save carousel as a Draft ────────────────────────────────────────
  const autoSaveToDraft = async (
    jId: string,
    topicText: string,
    fetchedSlides: Slide[],
    exports: any,
  ) => {
    setIsSavingDraft(true);
    try {
      const response = await api.post('/drafts', {
        platform: 'linkedin',
        content_type: 'carousel',
        title: topicText || 'LinkedIn Carousel',
        status: 'draft',
        content: JSON.stringify({ slides: fetchedSlides }),
        metadata: JSON.stringify({
          carousel_job_id: jId,
          slide_count: fetchedSlides.length,
          export_pdf_path: exports?.pdf_storage_path || null,
          export_zip_path: exports?.zip_storage_path || null,
          generated_at: new Date().toISOString(),
        }),
      });

      const draftId = response.data?.id;
      setSavedDraftId(draftId);

      toast.success('Carousel saved to Drafts!', {
        action: {
          label: 'View Drafts',
          onClick: () => navigate('/drafts'),
        },
        duration: 6000,
      });
    } catch (err: any) {
      console.error('Failed to auto-save carousel draft', err);
      toast.error('Carousel generated but could not be saved to Drafts.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setTopic('');
    setJobId(null);
    setStatus('idle');
    setSlides([]);
    setExportsReady(null);
    setError(null);
    setSavedDraftId(null);
    savedJobIdRef.current = null;
    window.history.replaceState({}, '', '/carousel');
  };

  // ── Status label ──────────────────────────────────────────────────────────
  const statusLabel = () => {
    switch (status) {
      case 'submitting': return 'Submitting…';
      case 'queued':     return 'Queued — waiting for worker…';
      case 'generating': return 'AI is generating your carousel…';
      case 'done':       return 'Done!';
      case 'failed':     return 'Failed';
      default:           return '';
    }
  };

  const isProcessing = status !== 'idle' && status !== 'done' && status !== 'failed';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <LayoutTemplate className="h-9 w-9 text-primary" />
            Carousel Engine
          </h1>
          <p className="text-muted-foreground">
            Transform any topic into a fully-designed 6-slide LinkedIn Carousel.
          </p>
        </div>
        {status === 'done' && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            New Carousel
          </Button>
        )}
      </div>

      {/* ── Input Card ── */}
      <Card className="max-w-2xl glass-card border border-primary/10 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Topic Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            id="topic"
            placeholder="e.g. Why async-first architectures scale better"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isProcessing}
            onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleGenerate()}
            className="h-12 border-primary/20 text-base focus:border-primary/50 transition-all"
          />

          {error && (
            <div className="text-red-500 text-sm font-medium p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {/* Status bar */}
          {isProcessing && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 border border-border/50">
              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              <span>{statusLabel()}</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isProcessing}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {statusLabel()}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Carousel ✨
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Done: Saved to Drafts banner ── */}
      {status === 'done' && (
        <div className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-500 ${
          savedDraftId
            ? 'bg-green-500/10 border-green-500/30'
            : isSavingDraft
            ? 'bg-muted/40 border-border/50'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {isSavingDraft ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : savedDraftId ? (
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
            ) : (
              <LayoutTemplate className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {isSavingDraft
                  ? 'Saving carousel to Drafts…'
                  : savedDraftId
                  ? 'Carousel saved to Drafts'
                  : 'Could not auto-save — save manually below'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {savedDraftId
                  ? 'Find it in Drafts → filter by Carousel type'
                  : 'Your slides are ready — use the export buttons below'}
              </p>
            </div>
          </div>
          {savedDraftId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/drafts')}
              className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 flex-shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in Drafts
            </Button>
          )}
        </div>
      )}

      {/* ── Slide Grid ── */}
      {status === 'done' && slides.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Slide Previews
              <Badge className="ml-3 bg-primary/15 text-primary border-primary/20 text-sm font-normal">
                {slides.length} slides
              </Badge>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {slides.map((s, idx) => (
              <div
                key={s.id || idx}
                className="relative w-full aspect-square rounded-xl overflow-hidden shadow-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 group border border-border/10"
                style={{ backgroundColor: '#1E1E2E', padding: '6%' }}
              >
                {/* ── Visual Slide Preview exactly matching PDF ── */}
                <div className="flex flex-col h-full w-full justify-start text-left relative z-10">
                  {/* Page Number (top right) */}
                  <div 
                    className="absolute top-0 right-0 font-medium"
                    style={{ color: '#6C7086', fontSize: 'clamp(12px, 3cqw, 20px)' }}
                  >
                    {idx + 1} / {slides.length}
                  </div>
                  
                  {/* Title */}
                  <div 
                    className="font-bold tracking-tight mt-[12%]"
                    style={{ 
                      color: '#F5E0DC', 
                      fontSize: 'clamp(18px, 5.5cqw, 48px)',
                      lineHeight: '1.2',
                      width: '90%'
                    }}
                  >
                    {s.title}
                  </div>
                  
                  {/* Body */}
                  <div 
                    className="mt-[6%] font-medium"
                    style={{ 
                      color: '#CDD6F4', 
                      fontSize: 'clamp(12px, 3.5cqw, 32px)',
                      lineHeight: '1.4',
                      width: '90%'
                    }}
                  >
                    {s.body}
                  </div>
                </div>

                {/* Subtle gradient overlay to make it pop slightly in the UI without changing the core look */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl" />
              </div>
            ))}
          </div>

          {/* ── Export Card ── */}
          {exportsReady && (
            <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden relative group">
              <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-in-out" />
              <CardContent className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1">
                  <h3 className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                    Export Ready
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Your high-resolution assets are bundled and ready to download.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF opens in a new tab for preview · ZIP downloads directly
                  </p>
                </div>

                <div className="flex gap-3 flex-shrink-0">
                  {/* ZIP — direct download */}
                  {exportsReady.zip_storage_path && (
                    <a
                      href={`${BACKEND}/api/carousel/${jobId}/asset/${exportsReady.zip_storage_path}?token=${getAuthToken()}`}
                      download
                    >
                      <Button
                        variant="outline"
                        className="h-12 px-6 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all font-medium gap-2"
                      >
                        <Archive className="h-4 w-4" />
                        Download ZIP
                      </Button>
                    </a>
                  )}

                  {/* PDF — open in new tab for preview */}
                  {exportsReady.pdf_storage_path && (
                    <a
                      href={`${BACKEND}/api/carousel/${jobId}/asset/${exportsReady.pdf_storage_path}?token=${getAuthToken()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="h-12 px-6 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all font-medium gap-2">
                        <FileText className="h-4 w-4" />
                        Preview PDF
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── No exports yet ── */}
          {!exportsReady && status === 'done' && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Download className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Export files are being generated… check back shortly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
