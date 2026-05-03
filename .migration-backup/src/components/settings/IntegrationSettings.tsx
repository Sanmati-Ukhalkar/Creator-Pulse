import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Linkedin, Mail, MessageCircle, Plug, CheckCircle, XCircle } from "lucide-react";
import { LinkedInConnect } from "./LinkedInConnect";

export function IntegrationSettings() {
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  // Fetch LinkedIn Status for Summary
  const { data: linkedinStatus } = useQuery({
    queryKey: ['linkedin-status'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/linkedin/status');
        return data;
      } catch (e) {
        return { connected: false };
      }
    },
    retry: false,
  });

  const isLinkedinConnected = linkedinStatus?.connected ?? false;

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Overview of all your connected services and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LinkedIn Status */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${isLinkedinConnected ? 'bg-blue-50/50 border-blue-100' : ''}`}>
              <div className="p-2 rounded-lg bg-blue-50">
                <Linkedin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">LinkedIn</span>
                  {isLinkedinConnected ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isLinkedinConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            {/* Email Status */}
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-lg bg-green-50">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Email</span>
                  {emailConfigured ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {emailConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
            </div>

            {/* WhatsApp Status */}
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-lg bg-green-50">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">WhatsApp</span>
                  {whatsappConnected ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {whatsappConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Details */}
      <Tabs defaultValue="linkedin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* LinkedIn Integration Tab */}
        <TabsContent value="linkedin">
          <LinkedInConnect />
        </TabsContent>

        {/* Other tabs remain unchanged (mock for now) */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Service Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for email delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simplified Email Config UI */}
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                Email configuration coming in future updates.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Business API
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp Business account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                WhatsApp integration coming in future updates.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}