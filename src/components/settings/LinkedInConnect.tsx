import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Linkedin, CheckCircle, XCircle, Loader2, ExternalLink,
  AlertCircle, ShieldCheck, Key, RefreshCw, Unlink, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LinkedInStatus {
  connected: boolean;
  username?: string;
  linkedinId?: string;
  tokenValid?: boolean;
  tokenExpires?: string;
  lastSync?: string;
}

// ─── Setup checklist item ─────────────────────────────────────────────────────

function CheckItem({ done, label, children }: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <div className={`flex gap-3 p-3 rounded-lg border transition-colors ${done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20"}`}>
      <div className="mt-0.5 flex-shrink-0">
        {done
          ? <CheckCircle className="h-4 w-4 text-emerald-500" />
          : <XCircle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <p className={`text-sm font-medium ${done ? "text-emerald-400" : "text-foreground"}`}>{label}</p>
        {children && <div className="text-xs text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LinkedInConnect() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [backendConfig, setBackendConfig] = useState<{ hasClientId: boolean; hasClientSecret: boolean; hasRedirectUri: boolean } | null>(null);

  // Fetch Connection Status
  const { data: status, isLoading, refetch } = useQuery<LinkedInStatus>({
    queryKey: ['linkedin-status'],
    queryFn: async () => {
      const { data } = await api.get('/linkedin/status');
      return data;
    },
    retry: false,
  });

  // Check backend config (via health endpoint already exposes what we need)
  useEffect(() => {
    // Try to get the auth URL — if it fails with config error, credentials are missing
    api.get('/linkedin/auth-url')
      .then(() => setBackendConfig({ hasClientId: true, hasClientSecret: true, hasRedirectUri: true }))
      .catch((e) => {
        const msg = e?.response?.data?.error || e?.message || "";
        const missingClientId = msg.toLowerCase().includes("client_id") || msg.toLowerCase().includes("credentials");
        setBackendConfig({
          hasClientId: !missingClientId,
          hasClientSecret: !missingClientId,
          hasRedirectUri: true,
        });
      });
  }, []);

  // Handle OAuth Callback Effects
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    if (linkedinParam === 'success') {
      toast({ title: "✅ LinkedIn Connected", description: "Your LinkedIn account has been successfully linked." });
      searchParams.delete('linkedin');
      setSearchParams(searchParams);
      queryClient.invalidateQueries({ queryKey: ['linkedin-status'] });
    } else if (linkedinParam === 'error' || linkedinParam === 'invalid_state') {
      toast({
        title: "Connection Failed",
        description: "LinkedIn OAuth failed. Check that your App credentials and redirect URI are correct.",
        variant: "destructive",
      });
      searchParams.delete('linkedin');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // Connect Mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/linkedin/auth-url');
      return data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.message || "Could not initiate LinkedIn connection.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => { await api.delete('/linkedin/disconnect'); },
    onSuccess: () => {
      toast({ title: "Disconnected", description: "LinkedIn account disconnected." });
      queryClient.invalidateQueries({ queryKey: ['linkedin-status'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect LinkedIn.", variant: "destructive" });
    }
  });

  const isConnected = status?.connected ?? false;
  const configReady = backendConfig?.hasClientId && backendConfig?.hasClientSecret;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Checking connection…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Connection Status Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077b5]" />
            LinkedIn Account
          </CardTitle>
          <CardDescription>
            Connect your LinkedIn to publish content directly from CreatorPulse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Row */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Linkedin className="h-5 w-5 text-[#0077b5]" />
              </div>
              <div>
                <p className="font-medium">
                  {isConnected ? (status?.username || "Connected User") : "Not connected"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? `LinkedIn ID: ${status?.linkedinId ?? "—"}`
                    : "Authorize CreatorPulse to post on your behalf"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  <CheckCircle className="h-3 w-3" /> Connected
                </Badge>
              )}
              {isConnected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Unlink className="h-4 w-4 mr-1" />Disconnect</>}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !configReady}
                  className="bg-[#0077b5] hover:bg-[#005e93] text-white"
                >
                  {connectMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Linkedin className="h-4 w-4 mr-2" />}
                  Connect LinkedIn
                </Button>
              )}
            </div>
          </div>

          {/* Token details when connected */}
          {isConnected && (
            <div className="space-y-3 pt-1">
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Token Status</p>
                  <Badge variant={status?.tokenValid ? "default" : "destructive"} className="text-xs">
                    {status?.tokenValid ? "Valid" : "Expired — will auto-refresh"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {["openid", "profile", "email", "w_member_social"].map(p => (
                      <Badge key={p} variant="secondary" className="text-[10px] font-normal">{p}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Setup Checklist ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Setup Checklist
          </CardTitle>
          <CardDescription>Complete these steps to enable LinkedIn publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CheckItem done={true} label="Backend LinkedIn service is built">
            OAuth2 flow, token storage, and UGC post API — all implemented.
          </CheckItem>

          <CheckItem
            done={!!backendConfig?.hasClientId}
            label="LINKEDIN_CLIENT_ID configured in backend/.env"
          >
            {!backendConfig?.hasClientId && (
              <span>
                Get it from your{" "}
                <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1">
                  LinkedIn Developer App <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            )}
          </CheckItem>

          <CheckItem
            done={!!backendConfig?.hasClientSecret}
            label="LINKEDIN_CLIENT_SECRET configured in backend/.env"
          >
            {!backendConfig?.hasClientSecret && "Found under your LinkedIn App → Auth tab."}
          </CheckItem>

          <CheckItem done={true} label="Redirect URI set to http://localhost:4000/api/linkedin/callback">
            Add this exact URL to your LinkedIn App's Authorized Redirect URLs.
          </CheckItem>

          <CheckItem done={isConnected} label="LinkedIn account connected">
            {!isConnected && "Click 'Connect LinkedIn' above after completing the steps below."}
          </CheckItem>
        </CardContent>
      </Card>

      {/* ── How to create LinkedIn App ── */}
      {!configReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-400">
              <Key className="h-4 w-4" />
              How to get your LinkedIn App credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                <>Go to <a href="https://www.linkedin.com/developers/apps/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">LinkedIn Developer Apps <ExternalLink className="h-3 w-3" /></a> and create a new app.</>,
                <>Fill in App Name (e.g. "CreatorPulse"), Company (your LinkedIn page), and upload a logo.</>,
                <>In your app's <strong>Auth</strong> tab, add this Redirect URL exactly: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">http://localhost:4000/api/linkedin/callback</code></>,
                <>In the <strong>Products</strong> tab, request access to <strong>"Share on LinkedIn"</strong> and <strong>"Sign In with LinkedIn using OpenID Connect"</strong>.</>,
                <>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the Auth tab.</>,
                <>Open <code className="bg-muted px-1.5 py-0.5 rounded text-xs">C:\Sam\Creator_Pulse\backend\.env</code> and set:<br />
                  <code className="bg-muted px-2 py-1 rounded text-xs block mt-1">
                    LINKEDIN_CLIENT_ID=your_client_id<br />
                    LINKEDIN_CLIENT_SECRET=your_client_secret
                  </code>
                </>,
                <>Restart the backend terminal (<code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run dev</code> in <code className="text-xs">backend/</code>), then click Connect LinkedIn above.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ── Publishing info ── */}
      {isConnected && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            LinkedIn is connected! To publish posts: go to <strong>Drafts</strong>, open any draft, and click <strong>"Publish Now"</strong>. You can also schedule via the <strong>Delivery</strong> page.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
