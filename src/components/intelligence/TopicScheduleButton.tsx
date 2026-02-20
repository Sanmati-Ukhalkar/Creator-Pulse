
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
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useAuth } from "@/hooks/useAuth";

interface TopicScheduleButtonProps {
  topicId: string;
  topicTitle: string;
}

export function TopicScheduleButton({ topicId, topicTitle }: TopicScheduleButtonProps) {
  const { user } = useAuth();
  const { scheduleDelivery, isScheduling } = useDeliveryScheduler();
  const { generateContent, isGenerating } = useContentGeneration();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<DeliveryPlatform[]>(["linkedin"]);
  const [selectedContentType, setSelectedContentType] = useState<DeliveryContentType>("post");
  const [customPrompt, setCustomPrompt] = useState("");

  const platforms: Array<{ id: DeliveryPlatform; name: string; color: string }> = [
    { id: "linkedin", name: "LinkedIn", color: "bg-blue-100 text-blue-800" },
    { id: "twitter", name: "Twitter", color: "bg-sky-100 text-sky-800" },
    { id: "instagram", name: "Instagram", color: "bg-pink-100 text-pink-800" },
    { id: "facebook", name: "Facebook", color: "bg-indigo-100 text-indigo-800" },
    { id: "youtube", name: "YouTube", color: "bg-red-100 text-red-800" },
    { id: "tiktok", name: "TikTok", color: "bg-black text-white" }
  ];

  const contentTypes: Array<{ id: DeliveryContentType; name: string }> = [
    { id: "post", name: "Post" },
    { id: "thread", name: "Thread" },
    { id: "story", name: "Story" },
    { id: "reel", name: "Reel" },
    { id: "video", name: "Video" },
    { id: "carousel", name: "Carousel" },
    { id: "article", name: "Article" }
  ];

  const togglePlatform = (platformId: DeliveryPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSchedule = async () => {
    if (!user) return;

    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    selectedPlatforms.forEach(platformId => {
      scheduleDelivery({
        userId: user.id,
        platform: platformId,
        contentType: selectedContentType,
        scheduledFor: scheduledDateTime.toISOString(),
        autoGenerate: true,
        customPrompt: `Generate content about: ${topicTitle}. ${customPrompt}`.trim()
      });
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          Schedule Content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Content from "{topicTitle}"</DialogTitle>
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

              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={selectedContentType} onValueChange={(value) => setSelectedContentType(value as DeliveryContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
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

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label>Additional Instructions (Optional)</Label>
            <Textarea
              placeholder="Provide specific instructions for content generation..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Schedule Button */}
          <Button onClick={handleSchedule} className="w-full" disabled={isScheduling}>
            <Send className="h-4 w-4 mr-2" />
            {isScheduling ? "Scheduling..." : "Schedule Content Generation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
