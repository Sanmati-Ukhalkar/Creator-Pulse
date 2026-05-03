import React from 'react';
import { Users, TrendingUp, Calendar, Loader2, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface PlatformStatus {
  connected: boolean;
  username?: string;
  linkedinId?: string;
  tokenValid?: boolean;
}

export const PlatformCards = () => {
  const navigate = useNavigate();

  const { data: linkedinStatus, isLoading } = useQuery<PlatformStatus>({
    queryKey: ['linkedin-status'],
    queryFn: async () => {
      const { data } = await api.get('/linkedin/status');
      return data;
    },
    retry: false,
  });

  const { data: drafts } = useQuery<any[]>({
    queryKey: ['drafts-summary'],
    queryFn: async () => {
      const { data } = await api.get('/drafts');
      return data || [];
    },
    retry: false,
  });

  const nextLinkedInDraft = drafts?.find(
    (d: any) => d.platform === 'linkedin' && d.status === 'scheduled'
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  const isLinkedInConnected = linkedinStatus?.connected ?? false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* LinkedIn Card */}
      <div className={`bg-card border rounded-xl p-6 transition-all duration-200 hover-lift ${isLinkedInConnected ? 'border-blue-200' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">in</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">LinkedIn</h3>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isLinkedInConnected ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">
                  {isLinkedInConnected ? (linkedinStatus?.username || 'Connected') : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate('/settings')}
            title="Manage connection"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {isLinkedInConnected ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>Account</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Post</span>
              </div>
              <span className="text-xs text-foreground font-medium">
                {nextLinkedInDraft ? 'Scheduled' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Token</span>
              </div>
              <span className={`text-xs font-semibold ${linkedinStatus?.tokenValid ? 'text-emerald-600' : 'text-orange-500'}`}>
                {linkedinStatus?.tokenValid ? 'Valid' : 'Expired'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-3">Connect LinkedIn to publish directly</p>
            <button
              className="glass-button px-4 py-2 text-sm font-medium text-primary w-full justify-center"
              onClick={() => navigate('/settings')}
            >
              Connect LinkedIn
            </button>
          </div>
        )}
      </div>

      {/* Twitter — Coming Soon */}
      <div className="bg-card border border-border rounded-xl p-6 opacity-50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <span className="text-white font-bold text-sm">𝕏</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Twitter / X</h3>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Twitter integration coming in the next phase.</p>
      </div>

      {/* Instagram — Coming Soon */}
      <div className="bg-card border border-border rounded-xl p-6 opacity-50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">IG</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Instagram</h3>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Instagram integration coming in the next phase.</p>
      </div>
    </div>
  );
};
