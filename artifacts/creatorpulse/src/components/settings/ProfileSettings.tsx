import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera, User, Mail, Upload, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function ProfileSettings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile');
        if (response.data) {
          setFullName(response.data.full_name || "");
          setEmail(response.data.email || "");
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    loadProfile();
  }, [user?.id]);

  const saveProfile = async () => {
    if (!user?.id) return;
    try {
      setIsSaving(true);
      await api.put('/profile', { full_name: fullName || null, email: email || null });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(`Failed to update profile: ${e.response?.data?.error || e.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt="Profile picture" />
                <AvatarFallback className="text-lg bg-creator-gradient text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                variant="secondary"
                disabled
                title="Avatar upload coming soon"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="flex items-center gap-2" disabled>
                <Upload className="h-4 w-4" />
                Upload Photo
              </Button>
              <p className="text-sm text-muted-foreground">
                Avatar upload coming soon.
              </p>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <Button onClick={saveProfile} disabled={isSaving} className="bg-creator-gradient hover:bg-creator-gradient-secondary">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}