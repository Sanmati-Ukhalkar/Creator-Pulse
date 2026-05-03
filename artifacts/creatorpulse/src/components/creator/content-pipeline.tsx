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
      return (data || []).slice(0, 4);
    },
    retry: false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'review': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'scheduled': return <Zap className="w-4 h-4 text-violet-600" />;
      case 'published': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'draft': return `${base} bg-orange-50 text-orange-600`;
      case 'review': return `${base} bg-blue-50 text-blue-600`;
      case 'scheduled': return `${base} bg-violet-50 text-violet-700`;
      case 'published': return `${base} bg-emerald-50 text-emerald-700`;
      default: return `${base} bg-muted text-muted-foreground`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">Content Pipeline</h3>
        <button
          className="glass-button px-3 py-1.5 text-sm font-medium"
          onClick={() => navigate('/drafts')}
        >
          View All
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
        <div className="space-y-1">
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
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
                onClick={() => navigate('/drafts')}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{title}</p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">{item.platform}</span>
                    {timeAgo && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
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
