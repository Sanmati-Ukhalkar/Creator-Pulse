
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useDeliveryScheduler, type DeliveryPlatform, type DeliveryContentType } from "@/hooks/useDeliveryScheduler";
import { useAuth } from "@/hooks/useAuth";

interface DraftScheduleButtonProps {
  draftId: string;
  draftTitle: string;
  platform: string;
  contentType: string;
}

export function DraftScheduleButton({ draftId, draftTitle, platform, contentType }: DraftScheduleButtonProps) {
  const { user } = useAuth();
  const { scheduleDelivery, isScheduling } = useDeliveryScheduler();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<DeliveryPlatform[]>([platform as DeliveryPlatform]);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const platforms: Array<{ id: DeliveryPlatform; name: string; color: string }> = [
    { id: "linkedin", name: "LinkedIn", color: "bg-blue-100 text-blue-800" },
    { id: "twitter", name: "Twitter", color: "bg-sky-100 text-sky-800" },
    { id: "instagram", name: "Instagram", color: "bg-pink-100 text-pink-800" },
    { id: "facebook", name: "Facebook", color: "bg-indigo-100 text-indigo-800" },
    { id: "youtube", name: "YouTube", color: "bg-red-100 text-red-800" },
    { id: "tiktok", name: "TikTok", color: "bg-black text-white" }
  ];

  const togglePlatform = (platformId: DeliveryPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Map draft content_type (e.g., "text_post") to delivery enum (e.g., "post")
  const mapToDeliveryContentType = (draftType: string): DeliveryContentType => {
    switch (draftType) {
      case 'text_post':
      case 'caption':
      case 'long_form':
        return 'post';
      case 'thread':
        return 'thread';
      case 'article':
        return 'article';
      case 'story':
        return 'story';
      case 'reel':
        return 'reel';
      case 'carousel':
        return 'carousel';
      case 'video':
        return 'video';
      default:
        return 'post';
    }
  };

  const handleSchedule = () => {
    if (!user) return;

    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const deliveryType = mapToDeliveryContentType(contentType);

    selectedPlatforms.forEach(platformId => {
      scheduleDelivery({
        userId: user.id,
        platform: platformId,
        contentType: deliveryType,
        scheduledFor: scheduledDateTime.toISOString(),
        draftId,
        autoGenerate,
        customPrompt: customPrompt || undefined
      });
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule "{draftTitle}" for Delivery</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
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
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platformOption) => (
                <div
                  key={platformOption.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlatforms.includes(platformOption.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => togglePlatform(platformOption.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{platformOption.name}</span>
                    {selectedPlatforms.includes(platformOption.id) && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Generate Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-Generate Content</Label>
              <p className="text-sm text-muted-foreground">
                Automatically optimize content for each platform
              </p>
            </div>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>

          {/* Custom Prompt */}
          {autoGenerate && (
            <div className="space-y-2">
              <Label>Custom Instructions (Optional)</Label>
              <Textarea
                placeholder="Provide specific instructions for content optimization..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Schedule Button */}
          <Button onClick={handleSchedule} className="w-full" disabled={isScheduling}>
            <Send className="h-4 w-4 mr-2" />
            {isScheduling ? "Scheduling..." : "Schedule Delivery"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
