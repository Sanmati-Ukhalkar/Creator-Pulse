import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Key, Download, Trash2, Eye, EyeOff, Copy, Save } from "lucide-react";

export function SecurityPrivacy() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Your account security status and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-lg bg-creator-emerald/10">
                <Lock className="h-5 w-5 text-creator-emerald" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Strong</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-creator-emerald/10' : 'bg-creator-orange/10'}`}>
                <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-creator-emerald' : 'text-creator-orange'}`} />
              </div>
              <div>
                <p className="font-medium">2FA</p>
                <p className="text-sm text-muted-foreground">
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>

            {/* Removed API keys overview from user UI to avoid exposing internals */}
          </div>
        </CardContent>
      </Card>

      {/* Security Tabs */}
      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="2fa" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button className="bg-creator-gradient hover:bg-creator-gradient-secondary">
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2FA Tab */}
        <TabsContent value="2fa">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-creator-emerald/10' : 'bg-muted'}`}>
                    <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-creator-emerald' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled ? "Two-factor authentication is enabled" : "Use an authenticator app to generate codes"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorEnabled && (
                    <Badge className="bg-creator-emerald text-white">Enabled</Badge>
                  )}
                  <Button
                    variant={twoFactorEnabled ? "outline" : "default"}
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  >
                    {twoFactorEnabled ? "Disable" : "Enable"} 2FA
                  </Button>
                </div>
              </div>

              {!twoFactorEnabled && (
                <div className="p-4 bg-creator-orange/10 rounded-lg border border-creator-orange/20">
                  <p className="text-sm font-medium text-creator-orange mb-2">Security Recommendation</p>
                  <p className="text-sm text-muted-foreground">
                    Enable two-factor authentication to significantly increase your account security. 
                    We recommend using apps like Google Authenticator or Authy.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Key tab removed for non-admins */}

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and privacy preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Export */}
              <div className="space-y-3">
                <h4 className="font-medium">Data Export</h4>
                <p className="text-sm text-muted-foreground">
                  Download a copy of all your data including drafts, sources, and analytics.
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </div>

              <Separator />

              {/* Account Deletion */}
              <div className="space-y-3">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}