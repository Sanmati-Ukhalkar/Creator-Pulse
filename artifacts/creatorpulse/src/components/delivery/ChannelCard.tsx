import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, TrendingUp } from "lucide-react";
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
    <Card className={`transition-all duration-200 hover-lift ${
      channel.active
        ? "border-primary/30 ring-1 ring-primary/10"
        : "opacity-60 hover:opacity-80"
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              channel.active ? "bg-primary text-white" : "bg-muted"
            }`}>
              <Icon className={`h-5 w-5 ${
                channel.active ? "text-white" : "text-muted-foreground"
              }`} />
            </div>
            <div>
              <CardTitle className="text-base">{channel.name}</CardTitle>
              <CardDescription className="text-xs">{channel.description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={channel.active}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {channel.active && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Sent</div>
                <div className="text-xl font-bold text-foreground">{channel.stats.sent.toLocaleString()}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Delivered</div>
                <div className="text-xl font-bold text-emerald-600">
                  {channel.stats.delivered.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Delivery Rate</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {channel.deliveryRate}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                  <span>Open Rate</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {channel.openRate}
                </Badge>
              </div>
            </div>
          </>
        )}

        {!channel.active && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">
              Enable this channel to start delivering content
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            disabled={!channel.active}
            className="flex-1"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={!channel.active}
            className="flex-1"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
