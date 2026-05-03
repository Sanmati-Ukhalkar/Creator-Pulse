import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown, ChevronUp, RefreshCw, Activity, Circle, Database, Cpu, Layers, FileText, Rss, TrendingUp, AlertCircle } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Status = "ok" | "error" | "loading" | "unknown";

interface ServiceStatus {
  name: string;
  status: Status;
  latency?: number;
  detail?: string;
  data?: unknown;
  lastChecked?: string;
}

interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    // The app stores the JWT under 'auth_token' (see src/lib/api.ts)
    return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || null;
  } catch {
    return null;
  }
}

async function apiFetch(path: string, token: string | null): Promise<{ ok: boolean; latency: number; data?: unknown; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      return { ok: false, latency, error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
    }
    const data = await res.json().catch(() => null);
    return { ok: true, latency, data };
  } catch (err: unknown) {
    return { ok: false, latency: Date.now() - start, error: err instanceof Error ? err.message : "Network error" };
  }
}

function statusColor(s: Status) {
  if (s === "ok") return "#22c55e";
  if (s === "error") return "#ef4444";
  if (s === "loading") return "#f59e0b";
  return "#6b7280";
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: statusColor(status),
      boxShadow: status === "ok" ? `0 0 6px #22c55e88` : status === "error" ? `0 0 6px #ef444488` : "none",
      flexShrink: 0,
    }} />
  );
}

function Badge({ status }: { status: Status }) {
  const labels: Record<Status, string> = { ok: "OK", error: "ERROR", loading: "…", unknown: "—" };
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.5,
      padding: "2px 6px",
      borderRadius: 4,
      background: statusColor(status) + "22",
      color: statusColor(status),
      border: `1px solid ${statusColor(status)}44`,
    }}>
      {labels[status]}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EngineMonitor() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "trends" | "drafts" | "ingested" | "logs">("status");
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Backend API", status: "unknown" },
    { name: "Database", status: "unknown" },
    { name: "AI Service", status: "unknown" },
    { name: "Trends Engine", status: "unknown" },
    { name: "Scraper / RSS", status: "unknown" },
    { name: "Scheduler", status: "unknown" },
  ]);
  const [trendsData, setTrendsData] = useState<unknown[]>([]);
  const [draftsData, setDraftsData] = useState<unknown[]>([]);
  const [ingestedData, setIngestedData] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    const entry: LogEntry = {
      ts: new Date().toLocaleTimeString("en-IN", { hour12: false }),
      level,
      message,
    };
    setLogs(prev => [...prev.slice(-199), entry]);
  }, []);

  const runChecks = useCallback(async () => {
    setIsRefreshing(true);
    const token = getToken();
    addLog("info", "Running health checks…");

    const updated: ServiceStatus[] = [
      { name: "Backend API", status: "loading" },
      { name: "Database", status: "loading" },
      { name: "AI Service", status: "loading" },
      { name: "Trends Engine", status: "loading" },
      { name: "Scraper / RSS", status: "loading" },
      { name: "Scheduler", status: "loading" },
    ];
    setServices([...updated]);

    // 1. Health (backend + db) — /health is proxied via vite.config.ts
    const health = await apiFetch("/health", null);
    if (health.ok) {
      const d = health.data as Record<string, unknown>;
      const dbOk = d?.database === "connected";
      updated[0] = { name: "Backend API", status: "ok", latency: health.latency, detail: `Uptime: ${d?.uptime ?? 0}s`, data: d, lastChecked: new Date().toISOString() };
      updated[1] = { name: "Database", status: dbOk ? "ok" : "error", latency: health.latency, detail: dbOk ? "PostgreSQL connected" : `DB error: ${String(d?.database ?? "disconnected")}`, lastChecked: new Date().toISOString() };
      addLog("info", `Backend healthy — DB: ${d?.database}, uptime: ${d?.uptime}s`);
    } else if (health.error?.includes("503")) {
      // 503 means backend is up but DB is down
      updated[0] = { name: "Backend API", status: "ok", latency: health.latency, detail: "Running (DB issue)" };
      updated[1] = { name: "Database", status: "error", latency: health.latency, detail: "Cannot connect to PostgreSQL — check service is running" };
      addLog("error", `Database connection failed`);
    } else {
      updated[0] = { name: "Backend API", status: "error", latency: health.latency, detail: health.error };
      updated[1] = { name: "Database", status: "unknown", detail: "Backend unreachable — run: cd backend && npm run dev" };
      addLog("error", `Backend check failed: ${health.error}`);
    }

    // 2. AI Service — direct health proxy via backend
    const aiHealth = await apiFetch("/api/ai-status", null);
    if (aiHealth.ok) {
      const ad = aiHealth.data as Record<string, unknown>;
      updated[2] = { name: "AI Service", status: "ok", latency: aiHealth.latency, detail: `Model: ${ad?.model ?? "gpt-4"} — running`, lastChecked: new Date().toISOString() };
      addLog("info", `AI Service healthy — model: ${ad?.model}`);
    } else if (aiHealth.error?.includes("503")) {
      const ed = aiHealth.data as Record<string, unknown>;
      updated[2] = { name: "AI Service", status: "error", latency: aiHealth.latency, detail: String(ed?.detail ?? "Not running — start .\\start_service.bat") };
      addLog("warn", `AI Service unreachable`);
    } else {
      updated[2] = { name: "AI Service", status: "error", latency: aiHealth.latency, detail: aiHealth.error ?? "Unreachable" };
      addLog("warn", `AI Service check failed: ${aiHealth.error}`);
    }
    setServices([...updated]);

    // 3. Trends
    const trends = await apiFetch("/api/trends", token);
    if (trends.ok) {
      const arr = Array.isArray(trends.data) ? trends.data : [];
      updated[3] = { name: "Trends Engine", status: "ok", latency: trends.latency, detail: `${arr.length} trend(s) in DB`, data: arr, lastChecked: new Date().toISOString() };
      setTrendsData(arr);
      addLog("info", `Trends: ${arr.length} records fetched`);
    } else if (trends.error?.includes("401")) {
      updated[3] = { name: "Trends Engine", status: !token ? "unknown" : "error", latency: trends.latency, detail: !token ? "Log in to check" : "Auth token invalid — try re-logging in" };
      addLog(!token ? "info" : "warn", !token ? "Trends: not logged in" : `Trends 401: auth failed`);
    } else {
      updated[3] = { name: "Trends Engine", status: "error", latency: trends.latency, detail: trends.error };
      addLog("warn", `Trends fetch failed: ${trends.error}`);
    }

    // 4. Ingested Content (feeds / scrapes)
    const ingested = await apiFetch("/api/ingested-contents", token);
    if (ingested.ok) {
      const arr = Array.isArray(ingested.data) ? ingested.data : [];
      updated[4] = { name: "Scraper / RSS", status: "ok", latency: ingested.latency, detail: `${arr.length} item(s) ingested`, data: arr, lastChecked: new Date().toISOString() };
      setIngestedData(arr);
      addLog("info", `Ingested: ${arr.length} items`);
    } else if (ingested.error?.includes("401")) {
      updated[4] = { name: "Scraper / RSS", status: !token ? "unknown" : "error", latency: ingested.latency, detail: !token ? "Log in to check" : "Auth token invalid" };
    } else {
      updated[4] = { name: "Scraper / RSS", status: "error", latency: ingested.latency, detail: ingested.error };
      addLog("warn", `Ingested content fetch failed: ${ingested.error}`);
    }

    // 5. Drafts / Scheduler
    const drafts = await apiFetch("/api/drafts", token);
    if (drafts.ok) {
      const arr = Array.isArray(drafts.data) ? drafts.data : [];
      updated[5] = { name: "Scheduler", status: "ok", latency: drafts.latency, detail: `${arr.length} draft(s) · Scheduler active`, data: arr, lastChecked: new Date().toISOString() };
      setDraftsData(arr);
      addLog("info", `Drafts: ${arr.length} records`);
    } else if (drafts.error?.includes("401")) {
      updated[5] = { name: "Scheduler", status: !token ? "unknown" : "error", latency: drafts.latency, detail: !token ? "Log in to check" : "Auth token invalid" };
    } else {
      updated[5] = { name: "Scheduler", status: "error", latency: drafts.latency, detail: drafts.error };
      addLog("warn", `Drafts fetch failed: ${drafts.error}`);
    }

    setServices([...updated]);
    setLastRefresh(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    setIsRefreshing(false);
    addLog("info", "Health check complete.");
  }, [addLog, trendsData]);

  // Auto-refresh every 30s when open
  useEffect(() => {
    if (!open) return;
    runChecks();
    const id = setInterval(runChecks, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const overallStatus: Status = (() => {
    if (services.some(s => s.status === "loading")) return "loading";
    if (services.some(s => s.status === "error")) return "error";
    if (services.every(s => s.status === "ok")) return "ok";
    return "unknown";
  })();

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button */}
      <button
        id="engine-monitor-toggle"
        onClick={() => { setOpen(true); setMinimized(false); }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9998,
          display: open ? "none" : "flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: "10px 16px",
          cursor: "pointer",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(99,102,241,0.5)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)")}
      >
        <Activity size={15} color="#818cf8" />
        <span>Engine Monitor</span>
        <StatusDot status={overallStatus} />
      </button>

      {/* Monitor Panel */}
      {open && (
        <div
          id="engine-monitor-panel"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: minimized ? 260 : 520,
            maxHeight: minimized ? 48 : "80vh",
            background: "linear-gradient(145deg, #0a0f1e 0%, #0f172a 100%)",
            border: "1px solid #1e3a5f",
            borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter, system-ui, sans-serif",
            overflow: "hidden",
            transition: "width 0.25s, max-height 0.25s",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)",
            borderBottom: minimized ? "none" : "1px solid #1e3a5f",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={14} color="#818cf8" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.3 }}>
                Engine Monitor
              </span>
              <StatusDot status={overallStatus} />
              {lastRefresh && (
                <span style={{ fontSize: 10, color: "#475569", marginLeft: 4 }}>
                  {lastRefresh}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                title="Refresh"
                onClick={runChecks}
                disabled={isRefreshing}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 6, display: "flex" }}
              >
                <RefreshCw size={13} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
              </button>
              <button
                title={minimized ? "Expand" : "Minimize"}
                onClick={() => setMinimized(m => !m)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 6, display: "flex" }}
              >
                {minimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <button
                title="Close"
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 6, display: "flex" }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Tabs */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid #1e3a5f",
                flexShrink: 0,
                overflowX: "auto",
              }}>
                {([
                  { id: "status", label: "Status", icon: <Circle size={11} /> },
                  { id: "trends", label: `Trends (${trendsData.length})`, icon: <TrendingUp size={11} /> },
                  { id: "drafts", label: `Drafts (${draftsData.length})`, icon: <FileText size={11} /> },
                  { id: "ingested", label: `Ingested (${ingestedData.length})`, icon: <Rss size={11} /> },
                  { id: "logs", label: `Logs (${logs.length})`, icon: <Layers size={11} /> },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: activeTab === tab.id ? 700 : 400,
                      color: activeTab === tab.id ? "#818cf8" : "#64748b",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab.id ? "2px solid #818cf8" : "2px solid transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s",
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: 14,
                minHeight: 0,
              }}>
                {activeTab === "status" && (
                  <StatusTab services={services} />
                )}
                {activeTab === "trends" && (
                  <DataTab data={trendsData} emptyMsg="No trends found. Try triggering research." columns={["topic", "description", "score", "created_at"]} />
                )}
                {activeTab === "drafts" && (
                  <DataTab data={draftsData} emptyMsg="No drafts yet." columns={["title", "status", "content_type", "created_at"]} />
                )}
                {activeTab === "ingested" && (
                  <DataTab data={ingestedData} emptyMsg="No ingested content. Check your sources & run scraper." columns={["title", "source_type", "scraped_at", "url"]} />
                )}
                {activeTab === "logs" && (
                  <LogsTab logs={logs} logsEndRef={logsEndRef} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #engine-monitor-panel ::-webkit-scrollbar { width: 4px; height: 4px; }
        #engine-monitor-panel ::-webkit-scrollbar-track { background: #0f172a; }
        #engine-monitor-panel ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
      `}</style>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusTab({ services }: { services: ServiceStatus[] }) {
  const icons: Record<string, React.ReactNode> = {
    "Backend API": <Cpu size={13} color="#818cf8" />,
    "Database": <Database size={13} color="#34d399" />,
    "AI Service": <Activity size={13} color="#f59e0b" />,
    "Trends Engine": <TrendingUp size={13} color="#60a5fa" />,
    "Scraper / RSS": <Rss size={13} color="#fb7185" />,
    "Scheduler": <FileText size={13} color="#a78bfa" />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {services.map(svc => (
        <div key={svc.name} style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#0f172a",
          border: `1px solid ${svc.status === "error" ? "#ef444433" : "#1e3a5f"}`,
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <div style={{ flexShrink: 0 }}>{icons[svc.name]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{svc.name}</span>
              <Badge status={svc.status} />
              {svc.latency !== undefined && (
                <span style={{ fontSize: 10, color: "#475569", marginLeft: "auto" }}>{svc.latency}ms</span>
              )}
            </div>
            {svc.detail && (
              <span style={{
                fontSize: 10,
                color: svc.status === "error" ? "#f87171" : "#64748b",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {svc.detail}
              </span>
            )}
          </div>
          <StatusDot status={svc.status} />
        </div>
      ))}
    </div>
  );
}

function DataTab({ data, emptyMsg, columns }: { data: unknown[]; emptyMsg: string; columns: string[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        color: "#475569",
        gap: 8,
      }}>
        <AlertCircle size={24} />
        <span style={{ fontSize: 12, textAlign: "center" }}>{emptyMsg}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{data.length} record(s)</span>
      {data.map((item, i) => {
        const row = item as Record<string, unknown>;
        return (
          <div key={i} style={{
            background: "#0f172a",
            border: "1px solid #1e3a5f",
            borderRadius: 8,
            padding: "10px 12px",
          }}>
            {columns.map(col => row[col] !== undefined && (
              <div key={col} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "#475569", minWidth: 80, flexShrink: 0 }}>{col}</span>
                <span style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}>
                  {String(row[col] ?? "—").slice(0, 120)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LogsTab({ logs, logsEndRef }: { logs: LogEntry[]; logsEndRef: React.RefObject<HTMLDivElement> }) {
  const levelColor = { info: "#64748b", warn: "#f59e0b", error: "#ef4444" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {logs.length === 0 && (
        <span style={{ fontSize: 11, color: "#475569", padding: "16px 0" }}>No logs yet. Run a check.</span>
      )}
      {logs.map((log, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 10, lineHeight: 1.6 }}>
          <span style={{ color: "#334155", flexShrink: 0 }}>{log.ts}</span>
          <span style={{ color: levelColor[log.level], flexShrink: 0, textTransform: "uppercase", fontWeight: 600 }}>{log.level}</span>
          <span style={{ color: "#94a3b8" }}>{log.message}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}
