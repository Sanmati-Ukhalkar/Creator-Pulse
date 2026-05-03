
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useDeliverySchedules } from "@/hooks/useDeliveryScheduler";
import { useAuth } from "@/hooks/useAuth";

export function DeliveryHistory() {
  const { user } = useAuth();
  const { data: deliveries = [], isLoading } = useDeliverySchedules(user?.id || '');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "scheduled": return <Clock className="h-4 w-4 text-blue-500" />;
      case "processing": return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: "default",
      failed: "destructive", 
      scheduled: "secondary",
      processing: "secondary",
      cancelled: "secondary"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  const getPlatformColor = (platform: string) => {
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

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.custom_prompt?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         delivery.platform.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || delivery.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const completedDeliveries = deliveries.filter(d => d.status === 'sent' || d.status === 'failed');
  const successRate = completedDeliveries.length > 0 
    ? (deliveries.filter(d => d.status === 'sent').length / completedDeliveries.length) * 100 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>
            View and analyze your past content deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deliveries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {format(new Date(delivery.created_at), "MMM dd, yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {format(new Date(delivery.created_at), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlatformColor(delivery.platform)}>
                      {delivery.platform.charAt(0).toUpperCase() + delivery.platform.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {delivery.content_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      {getStatusBadge(delivery.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(delivery.scheduled_for), "MMM dd, HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDeliveries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deliveries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{deliveries.length}</div>
            <div className="text-sm text-muted-foreground">Total Deliveries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{deliveries.filter(d => d.status === 'sent').length}</div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{deliveries.filter(d => d.status === 'failed').length}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
