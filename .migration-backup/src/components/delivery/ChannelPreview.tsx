import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { X, Send, Settings, Eye, Mail, MessageCircle } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ChannelPreviewProps {
  channel: {
    id: string;
    name: string;
    icon: LucideIcon;
    description: string;
  };
  onClose: () => void;
}

export function ChannelPreview({ channel, onClose }: ChannelPreviewProps) {
  const Icon = channel.icon;
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-creator-gradient">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>{channel.name} Configuration</CardTitle>
              <CardDescription>
                Configure templates and preview how your content will appear
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-6">
            {channel.id === "email" && (
              <EmailSettings />
            )}
            {channel.id === "whatsapp" && (
              <WhatsAppSettings />
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            {channel.id === "email" && (
              <EmailPreview />
            )}
            {channel.id === "whatsapp" && (
              <WhatsAppPreview />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmailSettings() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-name">From Name</Label>
          <Input id="from-name" placeholder="Your Name" defaultValue="CreatorPulse" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="from-email">From Email</Label>
          <Input id="from-email" placeholder="hello@example.com" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subject-template">Subject Template</Label>
        <Input 
          id="subject-template" 
          placeholder="Your daily content digest - {{date}}"
          defaultValue="Your daily content digest - {{date}}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email-template">Email Template</Label>
        <Textarea 
          id="email-template"
          placeholder="Email template content..."
          rows={8}
          defaultValue={`Hello {{name}},

Here's your daily content digest:

{{content}}

Best regards,
The CreatorPulse Team`}
        />
      </div>
      
      <Button className="w-full">
        <Settings className="h-4 w-4 mr-2" />
        Save Email Settings
      </Button>
    </div>
  );
}

function WhatsAppSettings() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="whatsapp-token">WhatsApp API Token</Label>
        <Input 
          id="whatsapp-token" 
          type="password"
          placeholder="Enter your WhatsApp Business API token"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone-id">Phone Number ID</Label>
        <Input id="phone-id" placeholder="Enter your WhatsApp phone number ID" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="whatsapp-template">Message Template</Label>
        <Textarea 
          id="whatsapp-template"
          placeholder="WhatsApp message template..."
          rows={6}
          defaultValue={`🎯 Your daily content digest is ready!

{{content}}

✨ Powered by CreatorPulse`}
        />
      </div>
      
      <Button className="w-full">
        <Settings className="h-4 w-4 mr-2" />
        Save WhatsApp Settings
      </Button>
    </div>
  );
}

function EmailPreview() {
  const sampleContent = `# Today's Content Insights

## Trending Topics
- AI automation in content creation
- Social media engagement strategies
- Creator economy trends

## Your Content Performance
- Last post: 1.2K views, 85 likes
- Best performing hashtag: #ContentCreator
- Optimal posting time: 2:00 PM`;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4" />
          <span className="font-medium">Email Preview</span>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">From:</span>
            <span>CreatorPulse &lt;hello@creatorpulse.com&gt;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subject:</span>
            <span>Your daily content digest - January 15, 2024</span>
          </div>
          <Separator />
          <div className="bg-background rounded p-4 border">
            <pre className="whitespace-pre-wrap text-sm">{sampleContent}</pre>
          </div>
        </div>
      </div>
      
      <Button className="w-full" variant="outline">
        <Send className="h-4 w-4 mr-2" />
        Send Test Email
      </Button>
    </div>
  );
}

function WhatsAppPreview() {
  const sampleMessage = `🎯 Your daily content digest is ready!

# Today's Content Insights

## Trending Topics
- AI automation in content creation
- Social media engagement strategies

## Your Performance
- Last post: 1.2K views, 85 likes
- Best hashtag: #ContentCreator

✨ Powered by CreatorPulse`;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">WhatsApp Preview</span>
        </div>
        
        <div className="bg-creator-emerald/10 rounded-lg p-3 border border-creator-emerald/20">
          <pre className="whitespace-pre-wrap text-sm">{sampleMessage}</pre>
        </div>
      </div>
      
      <Button className="w-full" variant="outline">
        <Send className="h-4 w-4 mr-2" />
        Send Test Message
      </Button>
    </div>
  );
}