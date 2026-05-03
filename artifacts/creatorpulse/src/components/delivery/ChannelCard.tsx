import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ChannelCardProps {
  channel: {
    id: string;
    name: string;
    icon: LucideIcon;
    description: string;
    active: boolean;
    stats: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    };
    deliveryRate: string;
    openRate: string;
    clickRate: string;
  };
  onToggle: () => void;
  onConfigure: () => void;
  onPreview: () => void;
}

export function ChannelCard({ channel, onToggle, onConfigure, onPreview }: ChannelCardProps) {
  const Icon = channel.icon;
  
  return (
    <Card className={`transition-all ${
      channel.active 
        ? "ring-2 ring-primary/20 hover-lift hover-glow" 
        : "opacity-60 hover:opacity-80"
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              channel.active ? "bg-creator-gradient" : "bg-muted"
            }`}>
              <Icon className={`h-5 w-5 ${
                channel.active ? "text-white" : "text-muted-foreground"
              }`} />
            </div>
            <div>
              <CardTitle className="text-lg">{channel.name}</CardTitle>
              <CardDescription>{channel.description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={channel.active}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statistics */}
        {channel.active && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Sent</div>
                <div className="text-xl font-bold">{channel.stats.sent.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Delivered</div>
                <div className="text-xl font-bold text-creator-emerald">
                  {channel.stats.delivered.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Performance Metrics */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-creator-emerald" />
                <span className="text-sm">Delivery Rate</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {channel.deliveryRate}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-creator-violet" />
                <span className="text-sm">Open Rate</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {channel.openRate}
              </Badge>
            </div>
          </>
        )}
        
        {!channel.active && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Enable this channel to start delivering content
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigure}
            disabled={!channel.active}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreview}
            disabled={!channel.active}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}