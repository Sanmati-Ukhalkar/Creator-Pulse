import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Calendar, Trash2, MoreVertical, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Draft {
  id: string;
  platform: string;
  content_type: string;
  title?: string;
  content: {
    text?: string;
    hashtags?: string[];
    mentions?: string[];
  };
  metadata: {
    predicted_performance?: {
      likes?: number;
      comments?: number;
      shares?: number;
    };
    ai_suggestions?: string[];
  };
  status: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

interface DraftCardProps {
  draft: Draft;
  onEdit: (draft: Draft) => void;
  onSchedule: (draft: Draft) => void;
  onDelete: (id: string) => void;
  onDuplicate: (draft: Draft) => void;
}

export function DraftCard({ draft, onEdit, onSchedule, onDelete, onDuplicate }: DraftCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return 'bg-blue-500';
      case 'instagram':
        return 'bg-pink-500';
      case 'twitter':
        return 'bg-sky-500';
      case 'tiktok':
        return 'bg-black';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'published':
        return 'bg-green-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const contentText = typeof (draft.content as any)?.text === 'string'
    ? (draft.content as any).text
    : (typeof (draft.content as any) === 'string' ? String(draft.content) : '');
  const displayText = isExpanded ? contentText : truncateText(contentText);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getPlatformColor(draft.platform)}`} />
            <span className="text-sm font-medium capitalize">{draft.platform}</span>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getStatusColor(draft.status)} text-white`}
            >
              {draft.status}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(draft)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onDuplicate(draft)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(draft.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {draft.title && (
          <h3 className="text-sm font-semibold truncate">{draft.title}</h3>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content preview */}
        <div className="space-y-3">
          {contentText && (
            <div className="space-y-2">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {displayText}
              </p>
              {contentText.length > 150 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>
          )}

          {/* Hashtags */}
          {(() => {
            const raw = (draft.content as any)?.hashtags;
            let hashtags: string[] = [];
            if (Array.isArray(raw)) hashtags = raw as string[];
            else if (typeof raw === 'string') {
              hashtags = raw.split(/[,#\s]+/).map(t => t.trim()).filter(Boolean);
            }
            return hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
              {hashtags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{hashtags.length - 3} more
                </span>
              )}
            </div>
            ) : null;
          })()}

          {/* Performance prediction for LinkedIn */}
          {draft.platform === 'linkedin' && draft.metadata.predicted_performance && (
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-muted-foreground">📊 Predicted:</span>
                <div className="flex space-x-3">
                  <span>{draft.metadata.predicted_performance.likes || 0} likes</span>
                  <span>{draft.metadata.predicted_performance.comments || 0} comments</span>
                  {draft.metadata.predicted_performance.shares && (
                    <span>{draft.metadata.predicted_performance.shares} shares</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex items-center justify-between pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(draft)}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onDelete(draft.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}