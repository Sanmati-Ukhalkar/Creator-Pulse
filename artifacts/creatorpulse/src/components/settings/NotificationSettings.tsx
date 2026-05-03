import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, Clock, Save } from "lucide-react";

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState({
    newDrafts: true,
    deliveryConfirmations: true,
    systemUpdates: false,
    weeklyReports: true
  });

  const [inAppNotifications, setInAppNotifications] = useState({
    realTime: true,
    sound: false,
    desktop: true
  });

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [timezone, setTimezone] = useState("America/New_York");

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-drafts">New Drafts Generated</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new content drafts are ready for review
                </p>
              </div>
              <Switch
                id="email-drafts"
                checked={emailNotifications.newDrafts}
                onCheckedChange={(checked) => 
                  setEmailNotifications(prev => ({ ...prev, newDrafts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-delivery">Delivery Confirmations</Label>
                <p className="text-sm text-muted-foreground">
                  Receive confirmations when content is successfully delivered
                </p>
              </div>
              <Switch
                id="email-delivery"
                checked={emailNotifications.deliveryConfirmations}
                onCheckedChange={(checked) => 
                  setEmailNotifications(prev => ({ ...prev, deliveryConfirmations: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-system">System Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Important updates about new features and system changes
                </p>
              </div>
              <Switch
                id="email-system"
                checked={emailNotifications.systemUpdates}
                onCheckedChange={(checked) => 
                  setEmailNotifications(prev => ({ ...prev, systemUpdates: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-reports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Weekly summary of your content performance and analytics
                </p>
              </div>
              <Switch
                id="email-reports"
                checked={emailNotifications.weeklyReports}
                onCheckedChange={(checked) => 
                  setEmailNotifications(prev => ({ ...prev, weeklyReports: checked }))
                }
              />
            </div>
          </div>

          {Object.values(emailNotifications).some(Boolean) && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Active Email Notifications:</p>
              <div className="flex flex-wrap gap-1">
                {emailNotifications.newDrafts && <Badge variant="secondary">New Drafts</Badge>}
                {emailNotifications.deliveryConfirmations && <Badge variant="secondary">Delivery</Badge>}
                {emailNotifications.systemUpdates && <Badge variant="secondary">System</Badge>}
                {emailNotifications.weeklyReports && <Badge variant="secondary">Reports</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="inapp-realtime">Real-time Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications instantly when events occur
              </p>
            </div>
            <Switch
              id="inapp-realtime"
              checked={inAppNotifications.realTime}
              onCheckedChange={(checked) => 
                setInAppNotifications(prev => ({ ...prev, realTime: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="inapp-sound">Sound Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when receiving notifications
              </p>
            </div>
            <Switch
              id="inapp-sound"
              checked={inAppNotifications.sound}
              onCheckedChange={(checked) => 
                setInAppNotifications(prev => ({ ...prev, sound: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="inapp-desktop">Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show browser notifications even when app is minimized
              </p>
            </div>
            <Switch
              id="inapp-desktop"
              checked={inAppNotifications.desktop}
              onCheckedChange={(checked) => 
                setInAppNotifications(prev => ({ ...prev, desktop: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set specific hours when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Suppress notifications during specified hours
              </p>
            </div>
            <Switch
              id="quiet-hours"
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>

          {quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Select value={quietStart} onValueChange={setQuietStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={i} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Select value={quietEnd} onValueChange={setQuietEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={i} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Quiet hours:</span> {quietStart} - {quietEnd} ({timezone})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No notifications will be sent during these hours
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-creator-gradient hover:bg-creator-gradient-secondary">
          <Save className="h-4 w-4 mr-2" />
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
}