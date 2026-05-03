import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Rss, Brain, FileText, Send, CheckCircle2, Circle, Loader2,
  AlertCircle, RefreshCw, Play, ChevronRight, ArrowDown,
  Database, Cpu, Zap, TrendingUp, Users, Clock, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type StepStatus = "idle" | "running" | "done" | "error" | "skipped";

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: StepStatus;
  detail?: string;
  count?: number;
  action?: () => Promise<void>;
  actionLabel?: string;
}

interface PipelineStats {
  sources: number;
  ingested: number;
  trends: number;
  drafts: number;
  published: number;
}

function stepIcon(status: StepStatus, icon: React.ReactNode) {
  if (status === "running") return <Loader2 className="h-5 w-5 animate-spin text-amber-600" />;
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "error") return <AlertCircle className="h-5 w-5 text-red-600" />;
  if (status === "skipped") return <Circle className="h-5 w-5 text-slate-400" />;
  return <span className="text-slate-500">{icon}</span>;
}

function statusBadge(status: StepStatus) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    idle:    { label: "Idle",    cls: "bg-slate-100 text-slate-600" },
    running: { label: "Running", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    done:    { label: "Done",    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    error:   { label: "Error",   cls: "bg-red-50 text-red-700 border border-red-200" },
    skipped: { label: "Skipped", cls: "bg-slate-100 text-slate-500" },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function Workflow() {
  const { toast } = useToast();
  const [stats, setStats] = useState<PipelineStats>({ sources: 0, ingested: 0, trends: 0, drafts: 0, published: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);

  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: "sources",
      label: "Content Sources",
      description: "RSS feeds, Twitter/X accounts configured as data sources",
      icon: <Rss className="h-5 w-5" />,
      color: "#f97316",
      status: "idle",
    },
    {
      id: "scraper",
      label: "Scraper / Ingestion",
      description: "Pulls articles and posts from all active sources into the database",
      icon: <Database className="h-5 w-5" />,
      color: "#7c3aed",
      status: "idle",
      actionLabel: "Run Scraper",
    },
    {
      id: "ai_analysis",
      label: "AI Trend Analysis",
      description: "AI reads ingested content and extracts trending topics with relevance scores",
      icon: <Brain className="h-5 w-5" />,
      color: "#2563eb",
      status: "idle",
    },
    {
      id: "generation",
      label: "Content Generation",
      description: "GPT-4 writes LinkedIn posts in your voice from the top trends",
      icon: <Cpu className="h-5 w-5" />,
      color: "#16a34a",
      status: "idle",
    },
    {
      id: "drafts",
      label: "Draft Review",
      description: "Generated posts stored as drafts — review, edit, and approve",
      icon: <FileText className="h-5 w-5" />,
      color: "#d97706",
      status: "idle",
    },
    {
      id: "publish",
      label: "Publish to LinkedIn",
      description: "Scheduled or instant publishing directly to your LinkedIn feed",
      icon: <Send className="h-5 w-5" />,
      color: "#0077b5",
      status: "idle",
    },
  ]);

  const setStep = useCallback((id: string, patch: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [sourcesRes, ingestedRes, trendsRes, draftsRes] = await Promise.allSettled([
        api.get('/sources'),
        api.get('/ingested-contents'),
        api.get('/trends'),
        api.get('/drafts'),
      ]);

      const sources  = sourcesRes.status  === 'fulfilled' ? (sourcesRes.value.data?.length  ?? 0) : 0;
      const ingested = ingestedRes.status === 'fulfilled' ? (ingestedRes.value.data?.length ?? 0) : 0;
      const trends   = trendsRes.status   === 'fulfilled' ? (trendsRes.value.data?.length   ?? 0) : 0;
      const drafts   = draftsRes.status   === 'fulfilled' ? (draftsRes.value.data?.length   ?? 0) : 0;

      setStats({ sources, ingested, trends, drafts, published: 0 });

      setStep("sources",    { status: sources  > 0 ? "done" : "idle",  count: sources,  detail: `${sources} active source(s)` });
      setStep("scraper",    { status: ingested > 0 ? "done" : "idle",  count: ingested, detail: `${ingested} item(s) ingested` });
      setStep("ai_analysis",{ status: trends   > 0 ? "done" : "idle",  count: trends,   detail: `${trends} trend(s) extracted` });
      setStep("drafts",     { status: drafts   > 0 ? "done" : "idle",  count: drafts,   detail: `${drafts} draft(s) saved` });
      setStep("generation", { status: drafts   > 0 ? "done" : "idle",  detail: drafts > 0 ? "Generation complete" : "Waiting for trends" });
      setStep("publish",    { status: "idle", detail: "Connect LinkedIn to enable" });
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [setStep]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const runPipeline = async () => {
    setRunningPipeline(true);
    setPipelineProgress(0);
    toast({ title: "Pipeline started", description: "Running full content pipeline…" });

    try {
      setStep("sources", { status: "running", detail: "Checking sources…" });
      await sleep(700);
      setStep("sources", { status: "done", detail: `${stats.sources} source(s) active` });
      setPipelineProgress(16);

      setStep("scraper", { status: "running", detail: "Fetching content from sources…" });
      try {
        const sourcesRes = await api.get('/sources');
        const allSources = sourcesRes.data || [];
        let inserted = 0;
        for (const src of allSources) {
          try {
            const r = await api.post('/scraper/run', { source_id: src.id, user_id: src.user_id });
            inserted += r.data?.inserted_count || 0;
          } catch { /* skip failed sources */ }
        }
        setStep("scraper", { status: "done", detail: `${inserted} new item(s) ingested` });
      } catch {
        setStep("scraper", { status: "error", detail: "Scraper failed — check sources" });
      }
      setPipelineProgress(33);

      setStep("ai_analysis", { status: "running", detail: "AI analysing trends…" });
      try {
        const trendsRes = await api.post('/trends/trigger', {});
        const topicsCount = trendsRes.data?.topics_created ?? trendsRes.data?.count ?? "?";
        setStep("ai_analysis", { status: "done", detail: `${topicsCount} topic(s) created` });
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        const msg = err?.response?.data?.error || err?.message || "Analysis failed";
        setStep("ai_analysis", { status: "error", detail: msg });
      }
      setPipelineProgress(50);

      setStep("generation", { status: "running", detail: "Generating drafts via GPT-4…" });
      await sleep(800);
      setStep("generation", { status: "skipped", detail: "Trigger manually from Drafts page" });
      setPipelineProgress(66);

      setStep("drafts", { status: "running", detail: "Refreshing drafts…" });
      try {
        const draftsRes = await api.get('/drafts');
        const count = draftsRes.data?.length ?? 0;
        setStep("drafts", { status: count > 0 ? "done" : "idle", detail: `${count} draft(s) available`, count });
      } catch {
        setStep("drafts", { status: "error", detail: "Could not load drafts" });
      }
      setPipelineProgress(83);

      setStep("publish", { status: "skipped", detail: "Go to Drafts to publish" });
      setPipelineProgress(100);

      toast({ title: "Pipeline complete!", description: "Check Trends and Drafts for results." });
    } catch {
      toast({ title: "Pipeline error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setRunningPipeline(false);
    }
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            End-to-end automation from source ingestion to LinkedIn publishing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoadingStats}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runPipeline} disabled={runningPipeline} size="sm">
            {runningPipeline
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running…</>
              : <><Play className="h-4 w-4 mr-2" />Run Pipeline</>
            }
          </Button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Sources",   value: stats.sources,   icon: <Rss className="h-4 w-4" />,        color: "text-orange-500" },
          { label: "Ingested",  value: stats.ingested,  icon: <Database className="h-4 w-4" />,   color: "text-violet-600" },
          { label: "Trends",    value: stats.trends,    icon: <TrendingUp className="h-4 w-4" />, color: "text-blue-600"   },
          { label: "Drafts",    value: stats.drafts,    icon: <FileText className="h-4 w-4" />,   color: "text-amber-600"  },
          { label: "Published", value: stats.published, icon: <Send className="h-4 w-4" />,       color: "text-emerald-600"},
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 ${s.color} text-xs font-semibold`}>
              {s.icon} {s.label}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {runningPipeline && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pipeline progress</span>
            <span>{pipelineProgress}%</span>
          </div>
          <Progress value={pipelineProgress} className="h-2" />
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={step.id}>
            <div className={`
              flex items-center gap-4 p-5 rounded-xl border bg-card transition-all duration-200
              ${step.status === "running" ? "border-amber-200 bg-amber-50/30" : ""}
              ${step.status === "done"    ? "border-emerald-100" : ""}
              ${step.status === "error"   ? "border-red-200 bg-red-50/20" : ""}
              ${step.status === "idle" || step.status === "skipped" ? "border-border" : ""}
            `}>
              <div className="flex flex-col items-center gap-1 w-10 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${step.color}18`, border: `1px solid ${step.color}40` }}>
                  {stepIcon(step.status, step.icon)}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{idx + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{step.label}</span>
                  {statusBadge(step.status)}
                  {step.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">{step.count}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {step.detail && (
                  <p className={`text-xs mt-1 font-medium ${
                    step.status === "error" ? "text-red-600" :
                    step.status === "done"  ? "text-emerald-600" : "text-muted-foreground"
                  }`}>
                    → {step.detail}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {step.id === "sources"     && <a href="/sources"     className="text-xs text-primary hover:underline flex items-center gap-1">Manage <ChevronRight className="h-3 w-3" /></a>}
                {step.id === "scraper"     && <a href="/sources"     className="text-xs text-primary hover:underline flex items-center gap-1">Sources <ChevronRight className="h-3 w-3" /></a>}
                {step.id === "ai_analysis" && <a href="/intelligence" className="text-xs text-primary hover:underline flex items-center gap-1">View <ChevronRight className="h-3 w-3" /></a>}
                {step.id === "generation"  && <a href="/drafts"      className="text-xs text-primary hover:underline flex items-center gap-1">Generate <ChevronRight className="h-3 w-3" /></a>}
                {step.id === "drafts"      && <a href="/drafts"      className="text-xs text-primary hover:underline flex items-center gap-1">Review <ChevronRight className="h-3 w-3" /></a>}
                {step.id === "publish"     && <a href="/delivery"    className="text-xs text-primary hover:underline flex items-center gap-1">Schedule <ChevronRight className="h-3 w-3" /></a>}
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          How the pipeline works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex gap-2"><Zap className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Run Pipeline</strong> — triggers the scraper for all sources, then asks the AI to extract trends. Generation is manual to save API tokens.</span></div>
          <div className="flex gap-2"><Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Scheduler</strong> — background cron runs every night; no need to manually trigger every day.</span></div>
          <div className="flex gap-2"><Brain className="h-3.5 w-3.5 text-violet-600 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">AI Generation</strong> — connect an AI provider via Replit Secrets to enable real content generation.</span></div>
          <div className="flex gap-2"><Users className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">LinkedIn Publishing</strong> — requires OAuth connection in Settings. Then use "Publish Now" in Drafts.</span></div>
        </div>
      </div>
    </div>
  );
}
