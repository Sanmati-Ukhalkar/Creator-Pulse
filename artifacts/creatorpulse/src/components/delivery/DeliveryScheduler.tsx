
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Send, 
  Settings, 
  CheckCircle
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { WeeklyScheduleGrid } from "./WeeklyScheduleGrid";
import { useDeliveryScheduler, type DeliveryPlatform, type DeliveryContentType } from "@/hooks/useDeliveryScheduler";
import { useAuth } from "@/hooks/useAuth";

interface ScheduledDelivery {
  id: string;
  date: Date;
  time: string;
  platform: DeliveryPlatform;
  contentType: DeliveryContentType;
  status: 'scheduled' | 'pending_approval' | 'sent' | 'failed';
  draft?: any;
}

export function DeliveryScheduler() {
  const { user } = useAuth();
  const { scheduleDelivery, isScheduling } = useDeliveryScheduler();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<DeliveryPlatform[]>(["linkedin"]);
  const [contentType, setContentType] = useState<DeliveryContentType>("post");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [recurringSchedule, setRecurringSchedule] = useState(false);
  const [weeklySchedules, setWeeklySchedules] = useState<Record<string, string[]>>({
    monday: ["09:00"],
    tuesday: ["09:00"],
    wednesday: ["09:00"],
    thursday: ["09:00"],
    friday: ["09:00"],
    saturday: [],
    sunday: []
  });

  // Mock scheduled deliveries for demonstration
  const [scheduledDeliveries] = useState<ScheduledDelivery[]>([
    {
      id: "1",
      date: new Date(),
      time: "09:00",
      platform: "linkedin",
      contentType: "post",
      status: "scheduled"
    },
    {
      id: "2",
      date: addDays(new Date(), 1),
      time: "14:00",
      platform: "twitter",
      contentType: "post",
      status: "pending_approval"
    }
  ]);

  const platforms: Array<{ id: DeliveryPlatform; name: string; color: string }> = [
    { id: "linkedin", name: "LinkedIn", color: "bg-blue-100 text-blue-800" },
    { id: "twitter", name: "Twitter", color: "bg-sky-100 text-sky-800" },
    { id: "instagram", name: "Instagram", color: "bg-pink-100 text-pink-800" },
    { id: "facebook", name: "Facebook", color: "bg-indigo-100 text-indigo-800" },
    { id: "youtube", name: "YouTube", color: "bg-red-100 text-red-800" },
    { id: "tiktok", name: "TikTok", color: "bg-black text-white" }
  ];

  const contentTypes: Array<{ id: DeliveryContentType; name: string }> = [
    { id: "post", name: "Text Post" },
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

  const handleScheduleDelivery = () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    selectedPlatforms.forEach(platform => {
      scheduleDelivery({
        userId: user.id,
        platform,
        contentType,
        scheduledFor: scheduledDateTime.toISOString(),
        autoGenerate,
        customPrompt: customPrompt || undefined,
        recurringConfig: recurringSchedule ? { 
          frequency: 'weekly' as const, 
          weeklySchedules 
        } : undefined
      });
    });
  };

  const getDeliveriesForDate = (date: Date) => {
    return scheduledDeliveries.filter(delivery => 
      isSameDay(delivery.date, date)
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Scheduling Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule Delivery
            </CardTitle>
            <CardDescription>
              Plan content delivery across your platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

                {/* Quick Time Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Select</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["09:00", "12:00", "15:00", "18:00"].map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Platform Selection */}
            <div className="space-y-3">
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlatforms.includes(platform.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(value: DeliveryContentType) => setContentType(value)}>
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

            {/* Auto-Generate Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-Generate Content</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create content using AI
                </p>
              </div>
              <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
            </div>

            {/* Custom Prompt */}
            {autoGenerate && (
              <div className="space-y-2">
                <Label>Custom Prompt (Optional)</Label>
                <Textarea
                  placeholder="Provide specific instructions for content generation..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <Separator />

            {/* Recurring Schedule Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Recurring Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Set up weekly recurring deliveries
                </p>
              </div>
              <Switch checked={recurringSchedule} onCheckedChange={setRecurringSchedule} />
            </div>

            {/* Schedule Delivery Button */}
            <Button onClick={handleScheduleDelivery} className="w-full" disabled={isScheduling}>
              <Send className="h-4 w-4 mr-2" />
              {isScheduling ? "Scheduling..." : recurringSchedule ? "Setup Recurring Schedule" : "Schedule Delivery"}
            </Button>
          </CardContent>
        </Card>

        {/* Recurring Schedule Configuration */}
        {recurringSchedule && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Configure your weekly delivery schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyScheduleGrid
                schedules={weeklySchedules}
                onSchedulesChange={setWeeklySchedules}
                timezone="UTC"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scheduled Deliveries */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Deliveries
            </CardTitle>
            <CardDescription>
              {format(selectedDate, "MMMM dd, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {getDeliveriesForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deliveries scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getDeliveriesForDate(selectedDate).map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{delivery.time}</Badge>
                        <Badge className={
                          platforms.find(p => p.id === delivery.platform)?.color || ""
                        }>
                          {platforms.find(p => p.id === delivery.platform)?.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {contentTypes.find(t => t.id === delivery.contentType)?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          delivery.status === "sent" ? "default" :
                          delivery.status === "failed" ? "destructive" :
                          delivery.status === "pending_approval" ? "secondary" :
                          "outline"
                        }
                      >
                        {delivery.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
