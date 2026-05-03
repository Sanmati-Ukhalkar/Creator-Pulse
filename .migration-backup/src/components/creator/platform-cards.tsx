import React from 'react';
import { ExternalLink, Users, TrendingUp, Calendar, Loader2, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface PlatformStatus {
  connected: boolean;
  username?: string;
  linkedinId?: string;
  tokenValid?: boolean;
}

const platformConfig = [
  {
    key: 'linkedin',
    name: 'LinkedIn',
    color: 'from-blue-600 to-blue-800',
    settingsPath: '/settings',
  },
];

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  const isLinkedInConnected = linkedinStatus?.connected ?? false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* LinkedIn Card — Real Data */}
      <div className="glass-card p-6 hover-lift">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">L</span>
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">LinkedIn</h3>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isLinkedInConnected ? 'bg-creator-emerald' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">
                  {isLinkedInConnected
                    ? (linkedinStatus?.username || 'Connected')
                    : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-card-foreground transition-colors"
            onClick={() => navigate('/settings')}
            title="Manage connection"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {isLinkedInConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Account</span>
              </div>
              <span className="font-semibold text-creator-emerald text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Next Post</span>
              </div>
              <span className="text-sm text-card-foreground">
                {nextLinkedInDraft ? 'Scheduled' : 'None scheduled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Token</span>
              </div>
              <span className={`text-xs font-medium ${linkedinStatus?.tokenValid ? 'text-creator-emerald' : 'text-creator-orange'}`}>
                {linkedinStatus?.tokenValid ? 'Valid' : 'Expired'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Connect your LinkedIn to publish content directly</p>
            <button
              className="glass-button px-4 py-2 text-sm font-medium text-primary"
              onClick={() => navigate('/settings')}
            >
              Connect LinkedIn
            </button>
          </div>
        )}
      </div>

      {/* Twitter — Coming Soon */}
      <div className="glass-card p-6 hover-lift opacity-60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">T</span>
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Twitter/X</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Twitter integration coming in next phase</p>
        </div>
      </div>

      {/* Instagram — Coming Soon */}
      <div className="glass-card p-6 hover-lift opacity-60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-400 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">I</span>
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Instagram</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Instagram integration coming in next phase</p>
        </div>
      </div>
    </div>
  );
};