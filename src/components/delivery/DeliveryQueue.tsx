
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useDeliveryQueue, useDeliveryScheduler } from "@/hooks/useDeliveryScheduler";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export function DeliveryQueue() {
  const { user } = useAuth();
  const { data: queueItems = [], isLoading, refetch } = useDeliveryQueue(user?.id || '');
  const { cancelScheduledDelivery, updateScheduledDelivery, runDeliveryProcessor, isRunningProcessor, isUpdating } = useDeliveryScheduler();
  const [activeTab, setActiveTab] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState<string>("09:00");
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editPlatform, setEditPlatform] = useState<string>("");
  const [editContentType, setEditContentType] = useState<string>("");

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const filteredQueue = useMemo(() => {
    let items = [...queueItems];
    if (platformFilter !== 'all') items = items.filter(i => i.platform === platformFilter);
    if (typeFilter !== 'all') items = items.filter(i => i.content_type === typeFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      const start = new Date();
      if (dateFilter === '24h') start.setDate(now.getDate() - 1);
      else if (dateFilter === '7d') start.setDate(now.getDate() - 7);
      else if (dateFilter === '30d') start.setDate(now.getDate() - 30);
      items = items.filter(i => new Date(i.scheduled_for) >= start);
    }
    return items;
  }, [queueItems, platformFilter, typeFilter, dateFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing': return <Play className="h-4 w-4 text-blue-500" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'scheduled': 'secondary',
      'processing': 'default',
      'sent': 'default',
      'failed': 'destructive',
      'cancelled': 'secondary'
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const getPlatformBadge = (platform: string) => {
    const colors = {
      linkedin: "bg-blue-100 text-blue-800",
      twitter: "bg-sky-100 text-sky-800", 
      instagram: "bg-pink-100 text-pink-800",
      facebook: "bg-indigo-100 text-indigo-800",
      youtube: "bg-red-100 text-red-800",
      tiktok: "bg-black text-white"
    };
    return colors[platform as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const filterItems = (status?: string) => {
    const base = (!status || status === 'all')
      ? filteredQueue
      : filteredQueue.filter(item => item.status === status);
    return base;
  };

  const getTabCounts = () => {
    return {
      all: filteredQueue.length,
      scheduled: filteredQueue.filter(i => i.status === 'scheduled').length,
      processing: filteredQueue.filter(i => i.status === 'processing').length,
      sent: filteredQueue.filter(i => i.status === 'sent').length,
      failed: filteredQueue.filter(i => i.status === 'failed').length
    };
  };

  const counts = getTabCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery Queue</CardTitle>
          <CardDescription>Loading your delivery queue...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Delivery Queue</CardTitle>
            <CardDescription>
              Monitor and manage your content delivery pipeline. Times shown in {timeZone}.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => runDeliveryProcessor({ minutesAhead: 15 })}>
              {isRunningProcessor ? 'Running…' : 'Run delivery now'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <Label>Platform</Label>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['all','linkedin','twitter','instagram','facebook','youtube','tiktok'].map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['all','post','thread','story','reel','video','carousel','article'].map(ct => (
                  <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date Range</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({counts.scheduled})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({counts.processing})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({counts.sent})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({counts.failed})</TabsTrigger>
          </TabsList>

          {(['all', 'scheduled', 'processing', 'sent', 'failed'] as const).map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              <div className="space-y-4">
                {filterItems(tabValue === 'all' ? undefined : tabValue).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(item.status)}
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">
                            {item.drafts?.title || `${item.content_type} for ${item.platform}`}
                          </h4>
                          <Badge className={getPlatformBadge(item.platform)}>
                            {item.platform}
                          </Badge>
                          <Badge variant="outline">{item.content_type}</Badge>
                          <Badge variant={getStatusBadge(item.status) as any}>
                            {item.status}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            Scheduled: {format(new Date(item.scheduled_for), "MMM dd, HH:mm")} 
                            ({formatDistanceToNow(new Date(item.scheduled_for), { addSuffix: true })})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {(item.status === 'scheduled' || item.status === 'failed') && (
                        <Button 
                          variant="ghost" size="sm" title="Edit"
                          onClick={() => {
                            setEditingId(item.id)
                            setEditPlatform(item.platform)
                            setEditContentType(item.content_type)
                            const dt = new Date(item.scheduled_for)
                            setEditDate(dt)
                            setEditTime(dt.toISOString().substring(11,16))
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {item.status === 'failed' && (
                        <Button 
                          variant="ghost" size="sm" title="Retry"
                          onClick={() => {
                            const dt = new Date(Date.now() + 2 * 60 * 1000);
                            updateScheduledDelivery({
                              scheduleId: item.id,
                              scheduledFor: dt.toISOString(),
                              status: 'scheduled' as any,
                            })
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {item.status === 'scheduled' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Cancel"
                          className="text-destructive"
                          onClick={() => cancelScheduledDelivery(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      {item.status === 'scheduled' && (
                        <Button 
                          variant="ghost" size="sm" title="Run now"
                          onClick={() => runDeliveryProcessor({ scheduleId: item.id })}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filterItems(tabValue === 'all' ? undefined : tabValue).length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No {tabValue === 'all' ? '' : tabValue} items in the queue
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>

    {/* Edit Delivery Dialog */}
    <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Delivery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate ? editDate.toISOString().substring(0,10) : ''}
                onChange={(e) => setEditDate(new Date(`${e.target.value}T${editTime}:00`))}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Select value={editTime} onValueChange={setEditTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2,'0')+':00').map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Platform</Label>
              <Select value={editPlatform} onValueChange={setEditPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['linkedin','twitter','instagram','facebook','youtube','tiktok'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content Type</Label>
              <Select value={editContentType} onValueChange={setEditContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['post','thread','story','reel','video','carousel','article'].map(ct => (
                    <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button
              disabled={!editingId || !editDate}
              onClick={() => {
                if (!editingId || !editDate) return
                const dt = new Date(editDate)
                const [hh, mm] = editTime.split(':')
                dt.setHours(parseInt(hh), parseInt(mm), 0, 0)
                updateScheduledDelivery({
                  scheduleId: editingId,
                  platform: editPlatform as any,
                  contentType: editContentType as any,
                  scheduledFor: dt.toISOString(),
                })
                setEditingId(null)
              }}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
