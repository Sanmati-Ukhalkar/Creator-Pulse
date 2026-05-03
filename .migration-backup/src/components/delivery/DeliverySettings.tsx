
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Clock, Bell, Globe, Zap, Save } from "lucide-react";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { useAuth } from "@/hooks/useAuth";

export function DeliverySettings() {
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, isUpdating } = useDeliverySettings(user?.id || '');
  
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [frequency, setFrequency] = useState("daily");
  const [timezone, setTimezone] = useState("UTC");
  const [enabledChannels, setEnabledChannels] = useState<string[]>(["email"]);

  useEffect(() => {
    if (settings) {
      setDeliveryTime(settings.delivery_time);
      setFrequency(settings.frequency);
      setTimezone(settings.timezone);
      setEnabledChannels(settings.channels);
    }
  }, [settings]);

  const channels = [
    { id: "email", name: "Email", description: "Receive delivery notifications via email" },
    { id: "push", name: "Push Notifications", description: "Browser push notifications" },
    { id: "slack", name: "Slack", description: "Slack workspace notifications" }
  ];

  const timezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
    { value: "America/Chicago", label: "Central Time (CST/CDT)" },
    { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
    { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
    { value: "Europe/Paris", label: "Central European Time (CET)" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
    { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
    { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" }
  ];

  const toggleChannel = (channelId: string) => {
    setEnabledChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSave = () => {
    updateSettings({
      delivery_time: deliveryTime,
      frequency,
      timezone,
      channels: enabledChannels
    });
  };

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
      {/* Delivery Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delivery Schedule
          </CardTitle>
          <CardDescription>
            Configure when your content should be delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Delivery Time</Label>
              <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                        {`${hour}:00`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about delivery events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{channel.name}</Label>
                  {enabledChannels.includes(channel.id) && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{channel.description}</p>
              </div>
              <Switch
                checked={enabledChannels.includes(channel.id)}
                onCheckedChange={() => toggleChannel(channel.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automated delivery behaviors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Auto-retry Failed Deliveries</Label>
              <p className="text-sm text-muted-foreground">
                Automatically retry failed deliveries up to 3 times
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Smart Scheduling</Label>
              <p className="text-sm text-muted-foreground">
                Optimize delivery times based on audience engagement data
              </p>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Content Optimization</Label>
              <p className="text-sm text-muted-foreground">
                Automatically optimize content for each platform
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating} className="min-w-[120px]">
          <Save className="h-4 w-4 mr-2" />
          {isUpdating ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
