import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { ContentPreferences } from "@/components/settings/ContentPreferences";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SecurityPrivacy } from "@/components/settings/SecurityPrivacy";
import { User, Palette, Plug, Bell, Shield } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

export default function Settings() {
  const { isAdmin } = useAdmin();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentPreferences />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="security" className="space-y-6">
            <SecurityPrivacy />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}