import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MetricCard } from "@/components/creator/metric-card";
import { ContentPipeline } from "@/components/creator/content-pipeline";
import { PlatformCards } from "@/components/creator/platform-cards";
import {
  TrendingUp,
  Users,
  Eye,
  Zap,
  Sparkles,
  Target,
  FileEdit,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: drafts } = useQuery<any[]>({
    queryKey: ['all-drafts-summary'],
    queryFn: async () => {
      const { data } = await api.get('/drafts');
      return data || [];
    },
    retry: false,
  });

  const { data: linkedinStatus } = useQuery<any>({
    queryKey: ['linkedin-status'],
    queryFn: async () => {
      const { data } = await api.get('/linkedin/status');
      return data;
    },
    retry: false,
  });

  const totalDrafts = drafts?.length ?? 0;
  const publishedDrafts = drafts?.filter((d: any) => d.status === 'published').length ?? 0;
  const scheduledDrafts = drafts?.filter((d: any) => d.status === 'scheduled').length ?? 0;
  const pendingDrafts = drafts?.filter((d: any) => d.status === 'draft').length ?? 0;
  const acceptanceRate = totalDrafts > 0 ? Math.round((publishedDrafts / totalDrafts) * 100) : 0;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const userName = user?.email?.split('@')[0] || 'Creator';

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {userName}!</h1>
          <p className="text-muted-foreground mt-0.5">Here's what's happening with your content today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="glass-button px-4 py-2 text-sm font-medium gap-2"
            onClick={() => navigate('/intelligence')}
          >
            <Sparkles className="w-4 h-4" />
            AI Studio
          </button>
          <button
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            onClick={() => navigate('/intelligence?platform=linkedin')}
          >
            <Zap className="w-4 h-4" />
            Quick Generate
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Pipeline Active</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Your Content Pipeline is Ready
            </h2>
            <p className="text-muted-foreground">
              {totalDrafts > 0
                ? `${totalDrafts} draft${totalDrafts !== 1 ? 's' : ''} in your pipeline${scheduledDrafts > 0 ? `, ${scheduledDrafts} scheduled` : ''}.${linkedinStatus?.connected ? ' LinkedIn is connected.' : ''}`
                : 'Generate your first AI-powered draft to get started.'}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                onClick={() => navigate('/drafts')}
              >
                <FileEdit className="w-4 h-4" />
                Review Drafts
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="glass-button px-5 py-2 text-sm font-medium"
              >
                Setup Guide
              </button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/8 flex-shrink-0">
            <Zap className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Draft Acceptance"
            value={`${acceptanceRate}%`}
            change={publishedDrafts > 0 ? `${publishedDrafts} published` : 'No publishes yet'}
            changeType="positive"
            icon={Target}
            gradient
          />
          <MetricCard
            title="Total Drafts"
            value={String(totalDrafts)}
            change={scheduledDrafts > 0 ? `${scheduledDrafts} scheduled` : 'None scheduled'}
            changeType="positive"
            icon={TrendingUp}
          />
          <MetricCard
            title="LinkedIn"
            value={linkedinStatus?.connected ? 'Connected' : 'Not connected'}
            change={
              linkedinStatus?.connected
                ? (linkedinStatus?.tokenValid ? 'Token valid' : 'Token expiring')
                : 'Go to Settings'
            }
            changeType={linkedinStatus?.connected ? 'positive' : 'negative'}
            icon={Users}
          />
          <MetricCard
            title="Pending Review"
            value={String(pendingDrafts)}
            change="drafts awaiting review"
            changeType="positive"
            icon={Eye}
          />
        </div>

        {/* Connected Platforms */}
        <div>
          <h3 className="text-base font-semibold mb-4 text-foreground">Connected Platforms</h3>
          <PlatformCards />
        </div>

        {/* Content Pipeline + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContentPipeline />

          <div className="glass-card p-6">
            <h3 className="text-base font-semibold mb-4 text-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="glass-button p-4 text-left flex flex-col gap-2 hover-lift rounded-lg"
                onClick={() => navigate('/intelligence?platform=linkedin')}
              >
                <Sparkles className="w-5 h-5 text-accent" />
                <p className="font-medium text-sm text-foreground">Generate Post</p>
                <p className="text-xs text-muted-foreground">Create from a topic</p>
              </button>
              <button
                className="glass-button p-4 text-left flex flex-col gap-2 hover-lift rounded-lg"
                onClick={() => navigate('/intelligence')}
              >
                <TrendingUp className="w-5 h-5 text-primary" />
                <p className="font-medium text-sm text-foreground">Trend Analysis</p>
                <p className="text-xs text-muted-foreground">Analyze trending topics</p>
              </button>
              <button
                className="glass-button p-4 text-left flex flex-col gap-2 rounded-lg opacity-50 cursor-not-allowed"
                disabled
              >
                <Users className="w-5 h-5 text-creator-emerald" />
                <p className="font-medium text-sm text-foreground">Audience Insights</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </button>
              <button
                className="glass-button p-4 text-left flex flex-col gap-2 hover-lift rounded-lg"
                onClick={() => navigate('/delivery')}
              >
                <Zap className="w-5 h-5 text-creator-orange" />
                <p className="font-medium text-sm text-foreground">Pulse Schedule</p>
                <p className="text-xs text-muted-foreground">Configure delivery</p>
              </button>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-foreground">AI Insights & Recommendations</h3>
            <span className="text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1 bg-muted">Powered by GPT-4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-creator-emerald rounded-full" />
                <span className="text-xs font-semibold text-creator-emerald uppercase tracking-wide">Tip</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground">LinkedIn Content Strategy</h4>
              <p className="text-sm text-muted-foreground">
                Posts with insights and personal stories drive 3x more engagement on LinkedIn.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Optimization</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground">Best Posting Time</h4>
              <p className="text-sm text-muted-foreground">
                LinkedIn audiences are most active Tuesday–Thursday, 9–11 AM.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Next Step</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground">
                {linkedinStatus?.connected ? 'Ready to Publish' : 'Connect LinkedIn'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {linkedinStatus?.connected
                  ? 'Your LinkedIn is connected. Open a draft and hit Publish to go live.'
                  : 'Go to Settings → LinkedIn to connect your account.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
