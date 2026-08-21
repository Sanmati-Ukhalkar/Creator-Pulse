import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, LayoutTemplate, Wand2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { DraftCard } from "@/components/drafts/DraftCard";
import { CarouselDraftCard } from "@/components/drafts/CarouselDraftCard";
import { DraftFilters } from "@/components/drafts/DraftFilters";
import { DraftScheduleButton } from "@/components/drafts/DraftScheduleButton";
import { DraftPublishButton } from "@/components/drafts/DraftPublishButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PostImagePanel } from "@/components/intelligence/PostImagePanel";
import { InlineCarouselGeneratorDialog } from "@/components/carousel/InlineCarouselGeneratorDialog";

interface Draft {
  id: string;
  user_id: string;
  platform: string;
  content_type: string;
  title?: string;
  content: any;
  metadata: any;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  upstream_status?: string;
  status: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

export default function Drafts() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editMentions, setEditMentions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");

  // Smart Carousel State — now handled by InlineCarouselGeneratorDialog
  const [showCarouselDialog, setShowCarouselDialog] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Fetch drafts from Supabase using React Query
  const { data, isLoading: loading } = useQuery({
    queryKey: ['drafts', currentPage, pageSize],
    queryFn: async () => {
      const response = await api.get(`/drafts?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}`);
      return response.data;
    },
    staleTime: 30_000,
  });

  const drafts: Draft[] = data?.data || [];
  const totalDrafts = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalDrafts / pageSize);

  // Calculate draft counts
  const draftCounts = useMemo(() => {
    return {
      linkedin: drafts.filter(d => d.platform === 'linkedin').length,
      instagram: drafts.filter(d => d.platform === 'instagram').length,
      total: drafts.length
    };
  }, [drafts]);

  // Filter drafts based on current filter states
  const filteredDrafts = useMemo(() => {
    let filtered = [...drafts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(draft => {
        // Parse content safely — carousel drafts store JSON string
        const contentText = (() => {
          try {
            const c = typeof draft.content === 'string' ? JSON.parse(draft.content) : draft.content;
            if (Array.isArray(c?.slides)) {
              return c.slides.map((s: any) => `${s.title || ''} ${s.body || ''}`).join(' ');
            }
            return c?.text || c?.content || '';
          } catch { return ''; }
        })();
        return (
          contentText.toLowerCase().includes(query) ||
          draft.title?.toLowerCase().includes(query) ||
          (draft.content as any)?.hashtags?.some((tag: string) => tag.toLowerCase().includes(query))
        );
      });
    }

    // Platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(draft => draft.platform === selectedPlatform);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(draft => draft.status === selectedStatus);
    }

    // Content type filter
    if (selectedContentType !== 'all') {
      filtered = filtered.filter(draft => draft.content_type === selectedContentType);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(draft =>
        new Date(draft.created_at) >= filterDate
      );
    }

    return filtered;
  }, [drafts, searchQuery, selectedPlatform, selectedStatus, selectedContentType, dateRange]);

  const handleEdit = (draft: Draft) => {
    setEditingDraft(draft);
    setEditTitle(draft.title || "");
    setEditText(draft.content?.text || "");
    const tags = Array.isArray(draft.content?.hashtags) ? draft.content.hashtags : [];
    const mentions = Array.isArray(draft.content?.mentions) ? draft.content.mentions : [];
    setEditHashtags(tags.join(", "));
    setEditMentions(mentions.join(", "));
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    try {
      setIsSaving(true);
      const parsedTags = editHashtags
        .split(/[,\n]/)
        .map(t => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const parsedMentions = editMentions
        .split(/[,\n]/)
        .map(m => m.trim().replace(/^@/, ""))
        .filter(Boolean);
      const updatedContent = { ...(editingDraft.content || {}), text: editText, hashtags: parsedTags, mentions: parsedMentions };

      const response = await api.put(`/drafts/${editingDraft.id}`, {
        title: editTitle,
        content: updatedContent
      });

      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setLastSavedAt(new Date().toLocaleTimeString());
      setEditingDraft(null);
      toast({ title: 'Saved', description: 'Draft updated.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save draft.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced autosave while editing
  useEffect(() => {
    if (!editingDraft) return;
    const handler = setTimeout(async () => {
      try {
        setIsSaving(true);
        const parsedTags = editHashtags
          .split(/[,\n]/)
          .map(t => t.trim().replace(/^#/, ""))
          .filter(Boolean);
        const parsedMentions = editMentions
          .split(/[,\n]/)
          .map(m => m.trim().replace(/^@/, ""))
          .filter(Boolean);
        const updatedContent = { ...(editingDraft.content || {}), text: editText, hashtags: parsedTags, mentions: parsedMentions };

        const response = await api.put(`/drafts/${editingDraft.id}`, {
          title: editTitle,
          content: updatedContent
        });

        if (response.data) {
          queryClient.invalidateQueries({ queryKey: ['drafts'] });
          setLastSavedAt(new Date().toLocaleTimeString());
        }
      } catch (e) {
        // Silent fail on autosave
      } finally {
        setIsSaving(false);
      }
    }, 1200);
    return () => clearTimeout(handler);
  }, [editTitle, editText, editHashtags, editMentions, editingDraft]);

  const handleSchedule = (draft: Draft) => {
    console.log("Legacy schedule handler called for draft:", draft.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/drafts/${id}`);

      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      toast({
        title: "Success",
        description: "Draft deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error",
        description: "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (draft: Draft) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Error",
          description: "You must be logged in to duplicate drafts.",
          variant: "destructive",
        });
        return;
      }

      const response = await api.post('/drafts', {
        platform: draft.platform,
        content_type: draft.content_type,
        title: draft.title ? `${draft.title} (Copy)` : undefined,
        content: draft.content,
        metadata: draft.metadata,
        status: 'draft'
      });

      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      toast({
        title: "Success",
        description: "Draft duplicated successfully.",
      });
    } catch (error) {
      console.error('Error duplicating draft:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedStatus('all');
    setSelectedContentType('all');
    setDateRange('all');
  };

  const createSampleDraft = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Error",
          description: "You must be logged in to create drafts.",
          variant: "destructive",
        });
        return;
      }

      const sampleContent = {
        text: "🚀 Excited to share my latest insights on AI and automation in the creator economy. The future of content creation is here, and it's more accessible than ever!\n\nKey takeaways:\n✨ AI tools are empowering creators, not replacing them\n📈 Automation saves time for strategic thinking\n🎯 Personalization at scale is now possible\n\nWhat's your experience with AI tools in your creative process? Let's discuss in the comments! 👇",
        hashtags: ["AI", "CreatorEconomy", "Automation", "ContentCreation", "Innovation"],
        mentions: []
      };

      const sampleDraft = {
        platform: "linkedin",
        content_type: "text_post",
        title: "AI in Creator Economy",
        content: sampleContent,
        metadata: {
          predicted_performance: {
            likes: 245,
            comments: 32,
            shares: 18
          },
          ai_suggestions: [
            "Add a call-to-action for engagement",
            "Consider adding relevant industry statistics",
            "Include a question to spark discussion"
          ]
        },
        status: "draft"
      };

      const response = await api.post('/drafts', sampleDraft);

      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      toast({
        title: "Success",
        description: "Sample draft created successfully!",
      });
    } catch (error) {
      console.error('Error creating sample draft:', error);
      toast({
        title: "Error",
        description: "Failed to create sample draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublishSuccess = async () => {
    if (!editingDraft) return;
    try {
      // Mark draft as published
      const response = await api.put(`/drafts/${editingDraft.id}`, { status: 'published' });

      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setEditingDraft(null); // Close dialog
      toast({ title: 'Success', description: 'Draft marked as published.' });
    } catch (e) {
      console.error('Failed to update draft status after publish', e);
    }
  };

  // handleGenerateCarousel is now handled inside InlineCarouselGeneratorDialog


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Drafts</h1>
          <p className="text-muted-foreground">
            Manage your content drafts across all platforms
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={createSampleDraft}>
            <Plus className="h-4 w-4 mr-2" />
            Create Draft
          </Button>
        </div>
      </div>

      {/* Filters */}
      <DraftFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedContentType={selectedContentType}
        onContentTypeChange={setSelectedContentType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        draftCounts={draftCounts}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className={`grid gap-4 ${viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
            }`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No drafts found</h3>
            <p className="text-muted-foreground mb-4">
              {drafts.length === 0
                ? "Get started by creating your first draft"
                : "Try adjusting your filters to find what you're looking for"
              }
            </p>
            <Button onClick={createSampleDraft}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sample Draft
            </Button>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1 max-w-4xl'
            }`}>
            {filteredDrafts.map((draft) => (
              <div key={draft.id} className="space-y-2">
                {draft.content_type === 'carousel' ? (
                  /* Carousel drafts get a dedicated card with built-in actions */
                  <CarouselDraftCard
                    draft={draft}
                    onDelete={() => {
                      // Card handles the API delete internally — just refresh the list
                      queryClient.invalidateQueries({ queryKey: ['drafts'] });
                    }}
                  />
                ) : (
                  /* All other draft types use the standard card */
                  <>
                    <DraftCard
                      draft={draft}
                      onEdit={handleEdit}
                      onSchedule={handleSchedule}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                    />
                    <div className="flex justify-end">
                      <DraftScheduleButton
                        draftId={draft.id}
                        draftTitle={draft.title || "Untitled Draft"}
                        draftContent={typeof draft.content === 'string' ? draft.content : (draft.content as any)?.text || (draft.content as any)?.content || draft.title || ''}
                        platform={draft.platform}
                        contentType={draft.content_type}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to Math.min(currentPage * pageSize, totalDrafts) of {totalDrafts} drafts
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center px-2 text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Edit Draft Dialog */}
      <Dialog open={!!editingDraft} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              rows={8}
              placeholder="Content"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            {/* Counters based on platform (soft for most, enforced for Twitter) */}
            {editingDraft && (
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Platform: {editingDraft.platform}</span>
                {(() => {
                  const limits: Record<string, number> = { twitter: 280, linkedin: 3000, instagram: 2200 };
                  const limit = limits[editingDraft.platform] || 0;
                  if (!limit) return null;
                  const count = editText.length;
                  const over = count > limit && editingDraft.platform === 'twitter';
                  return (
                    <span className={over ? 'text-destructive' : ''}>
                      {count}/{limit} {over ? '(over limit)' : ''}
                    </span>
                  );
                })()}
              </div>
            )}
            <Input
              placeholder="#hashtags (comma separated)"
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
            />
            {editHashtags.trim() && (
              <div className="flex flex-wrap gap-1">
                {editHashtags.split(/[,\n]/).map((t, i) => {
                  const tag = t.trim().replace(/^#/, "");
                  if (!tag) return null;
                  return (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded">#{tag}</span>
                  );
                })}
              </div>
            )}
            <Input
              placeholder="@mentions (comma separated)"
              value={editMentions}
              onChange={(e) => setEditMentions(e.target.value)}
            />
            {editMentions.trim() && (
              <div className="flex flex-wrap gap-1">
                {editMentions.split(/[,\n]/).map((m, i) => {
                  const handle = m.trim().replace(/^@/, "");
                  if (!handle) return null;
                  return (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded">@{handle}</span>
                  );
                })}
              </div>
            )}

            {/* ── AI Image Panel for existing drafts ── */}
            {editingDraft && (
              <PostImagePanel
                postText={editText}
                topic={editTitle || "Untitled Draft"}
                draftId={editingDraft.id}
                onImageGenerated={() => {
                  // Refresh drafts list so the card thumbnail updates
                  queryClient.invalidateQueries({ queryKey: ['drafts'] });
                }}
              />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 gap-4 sm:gap-2">
              <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {isSaving ? 'Saving...' : lastSavedAt ? `Autosaved at ${lastSavedAt}` : ''}
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={!!(editingDraft && editingDraft.platform === 'twitter' && editText.length > 280)}>Save</Button>
                <Button
                  onClick={() => setShowCarouselDialog(true)}
                  className="bg-creator-violet hover:bg-creator-violet/90 text-white"
                >
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Turn into Carousel
                </Button>
                {editingDraft && editingDraft.platform === 'linkedin' && (
                  <DraftPublishButton
                    content={editText}
                    draftId={editingDraft.id}
                    onSuccess={handlePublishSuccess}
                    disabled={!editText.trim()}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Carousel Generator — full cycle in one modal, no navigation away */}
      <InlineCarouselGeneratorDialog
        open={showCarouselDialog}
        onOpenChange={setShowCarouselDialog}
        sourceText={editText}
        topic={editTitle || editingDraft?.title || "LinkedIn Carousel"}
        sourceDraftId={editingDraft?.id}
      />
    </div>
  );
}
