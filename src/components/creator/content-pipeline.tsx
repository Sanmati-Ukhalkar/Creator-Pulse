import React from 'react';
import { Clock, CheckCircle, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const ContentPipeline = () => {
  const navigate = useNavigate();

  const { data: drafts, isLoading } = useQuery<any[]>({
    queryKey: ['pipeline-drafts'],
    queryFn: async () => {
      const { data } = await api.get('/drafts');
      return (data || []).slice(0, 4); // Show latest 4
    },
    retry: false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <AlertCircle className="w-4 h-4 text-creator-orange" />;
      case 'review': return <Clock className="w-4 h-4 text-creator-cyan" />;
      case 'scheduled': return <Zap className="w-4 h-4 text-creator-violet" />;
      case 'published': return <CheckCircle className="w-4 h-4 text-creator-emerald" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'draft': return `${baseClasses} bg-creator-orange/20 text-creator-orange`;
      case 'review': return `${baseClasses} bg-creator-cyan/20 text-creator-cyan`;
      case 'scheduled': return `${baseClasses} bg-creator-violet/20 text-creator-violet`;
      case 'published': return `${baseClasses} bg-creator-emerald/20 text-creator-emerald`;
      default: return `${baseClasses} bg-muted text-muted-foreground`;
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Content Pipeline</h3>
        <button
          className="glass-button px-4 py-2 text-sm font-medium"
          onClick={() => navigate('/drafts')}
        >
          View All
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !drafts || drafts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">No drafts yet.</p>
          <button
            className="glass-button px-4 py-2 text-sm font-medium text-primary"
            onClick={() => navigate('/intelligence')}
          >
            Generate Your First Draft
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((item: any) => {
            const title = item.title || item.content?.text?.slice(0, 50) || 'Untitled Draft';
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
              } catch {
                return '';
              }
            })();

            return (
              <div
                key={item.id}
                className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/drafts')}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground capitalize">{item.platform}</span>
                    {timeAgo && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={getStatusBadge(item.status)}>{item.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};