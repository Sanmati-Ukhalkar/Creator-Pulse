import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatedBackground } from "@/components/ui/animated-background";
import { MetricCard } from "@/components/creator/metric-card";
import { ContentPipeline } from "@/components/creator/content-pipeline";
import { PlatformCards } from "@/components/creator/platform-cards";
import {
  TrendingUp,
  Users,
  Eye,
  Zap,
  Sparkles,
  Target
} from 'lucide-react';
import heroImage from '@/assets/creator-hero.jpg';
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
      <AnimatedBackground />

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold creator-text-gradient">{greeting}, {userName}!</h1>
              <p className="text-muted-foreground">Ready to create something amazing today?</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="glass-button px-4 py-2 text-sm font-medium" onClick={() => navigate('/intelligence')}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Studio
            </button>
            <button
              className="bg-creator-gradient px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground hover-lift"
              onClick={() => navigate('/intelligence?platform=linkedin')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Generate
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="CreatorPulse Dashboard"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60" />
          </div>
          <div className="relative p-8 lg:p-12">
            <div className="max-w-2xl">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                Your Daily <span className="creator-text-gradient">Pulse</span> is Ready
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {totalDrafts > 0
                  ? `${totalDrafts} draft${totalDrafts !== 1 ? 's' : ''} in your pipeline${scheduledDrafts > 0 ? `, ${scheduledDrafts} scheduled` : ''}.${linkedinStatus?.connected ? ' LinkedIn is connected and ready to publish.' : ''}`
                  : 'Generate your first AI-powered draft to get started.'}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  className="bg-creator-gradient px-6 py-3 rounded-lg font-medium text-primary-foreground hover-lift"
                  onClick={() => navigate('/drafts')}
                >
                  Review Drafts
                </button>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="glass-button px-6 py-3 font-medium"
                >
                  Try Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Platform Cards */}
        <div>
          <h3 className="text-xl font-semibold mb-6 text-card-foreground">Connected Platforms</h3>
          <PlatformCards />
        </div>

        {/* Content Pipeline + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContentPipeline />

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 text-card-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="glass-button p-4 text-left space-y-2 hover-lift"
                onClick={() => navigate('/intelligence?platform=linkedin')}
              >
                <Sparkles className="w-6 h-6 text-creator-violet" />
                <p className="font-medium text-sm">Generate LinkedIn Post</p>
                <p className="text-xs text-muted-foreground">Create a post from a topic</p>
              </button>
              <button
                className="glass-button p-4 text-left space-y-2 hover-lift"
                onClick={() => navigate('/intelligence')}
              >
                <TrendingUp className="w-6 h-6 text-creator-cyan" />
                <p className="font-medium text-sm">Trend Analysis</p>
                <p className="text-xs text-muted-foreground">Analyze trending topics</p>
              </button>
              <button
                className="glass-button p-4 text-left space-y-2 opacity-60 cursor-not-allowed"
                disabled
              >
                <Users className="w-6 h-6 text-creator-emerald" />
                <p className="font-medium text-sm">Audience Insights</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </button>
              <button
                className="glass-button p-4 text-left space-y-2 hover-lift"
                onClick={() => navigate('/delivery')}
              >
                <Zap className="w-6 h-6 text-creator-orange" />
                <p className="font-medium text-sm">Pulse Schedule</p>
                <p className="text-xs text-muted-foreground">Configure delivery settings</p>
              </button>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-card-foreground">AI Insights & Recommendations</h3>
            <span className="glass-button px-3 py-1 text-xs font-medium">Powered by GPT-4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-creator-emerald rounded-full" />
                <span className="text-sm font-medium text-creator-emerald">Tip</span>
              </div>
              <h4 className="font-semibold text-card-foreground">LinkedIn Content Strategy</h4>
              <p className="text-sm text-muted-foreground">
                Posts with insights and personal stories drive 3x more engagement on LinkedIn. Try generating a thought-leadership piece.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-creator-violet rounded-full" />
                <span className="text-sm font-medium text-creator-violet">Optimization</span>
              </div>
              <h4 className="font-semibold text-card-foreground">Best Posting Time</h4>
              <p className="text-sm text-muted-foreground">
                LinkedIn audiences are most active Tuesday–Thursday, 9–11 AM. Use the scheduler to time your posts for maximum reach.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-creator-cyan rounded-full" />
                <span className="text-sm font-medium text-creator-cyan">Next Step</span>
              </div>
              <h4 className="font-semibold text-card-foreground">
                {linkedinStatus?.connected ? 'Ready to Publish' : 'Connect LinkedIn'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {linkedinStatus?.connected
                  ? 'Your LinkedIn is connected. Open a draft and hit Publish to go live.'
                  : 'Go to Settings → LinkedIn to connect your account and start publishing directly.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;