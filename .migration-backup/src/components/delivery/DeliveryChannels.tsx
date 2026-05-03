import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      stats: {
        sent: 1247,
        delivered: 1198,
        opened: 856,
        clicked: 234
      },
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
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0
      },
      deliveryRate: "0%",
      openRate: "0%",
      clickRate: "0%"
    }
  ];

  const toggleChannel = (channelId: string) => {
    setActiveChannels(prev => ({
      ...prev,
      [channelId]: !prev[channelId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Channel Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Channel Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Delivery Analytics
          </CardTitle>
          <CardDescription>
            Performance metrics across all active channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-creator-cyan">1247</div>
              <div className="text-sm text-muted-foreground">Total Sent</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-creator-emerald">1198</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-creator-violet">856</div>
              <div className="text-sm text-muted-foreground">Opened</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-creator-orange">234</div>
              <div className="text-sm text-muted-foreground">Clicked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Configuration/Preview */}
      {selectedChannel && (
        <ChannelPreview
          channel={channels.find(c => c.id === selectedChannel)!}
          onClose={() => setSelectedChannel(null)}
        />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure Templates
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Test Delivery
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}