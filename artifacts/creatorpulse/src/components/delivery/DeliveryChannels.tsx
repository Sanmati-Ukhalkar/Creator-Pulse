import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "@/components/delivery/ChannelCard";
import { ChannelPreview } from "@/components/delivery/ChannelPreview";
import { Mail, MessageCircle, Settings, Eye, BarChart3 } from "lucide-react";

export function DeliveryChannels() {
  const [activeChannels, setActiveChannels] = useState({
    email: true,
    whatsapp: false
  });

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const channels = [
    {
      id: "email",
      name: "Email",
      icon: Mail,
      description: "Send drafts via email newsletters",
      active: activeChannels.email,
      stats: { sent: 1247, delivered: 1198, opened: 856, clicked: 234 },
      deliveryRate: "96.1%",
      openRate: "71.4%",
      clickRate: "27.3%"
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: MessageCircle,
      description: "Send drafts via WhatsApp messages",
      active: activeChannels.whatsapp,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
      deliveryRate: "0%",
      openRate: "0%",
      clickRate: "0%"
    }
  ];

  const toggleChannel = (channelId: string) => {
    setActiveChannels(prev => ({
      ...prev,
      [channelId]: !prev[channelId as keyof typeof prev]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onToggle={() => toggleChannel(channel.id)}
            onConfigure={() => setSelectedChannel(channel.id)}
            onPreview={() => setSelectedChannel(channel.id)}
          />
        ))}
      </div>

      {/* Delivery Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Delivery Analytics
          </CardTitle>
          <CardDescription>
            Performance metrics across all active channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">1247</div>
              <div className="text-xs text-muted-foreground">Total Sent</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-emerald-600">1198</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-violet-600">856</div>
              <div className="text-xs text-muted-foreground">Opened</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-orange-500">234</div>
              <div className="text-xs text-muted-foreground">Clicked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedChannel && (
        <ChannelPreview
          channel={channels.find(c => c.id === selectedChannel)!}
          onClose={() => setSelectedChannel(null)}
        />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configure Templates
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Test Delivery
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
