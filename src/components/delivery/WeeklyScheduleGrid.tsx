import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

interface WeeklyScheduleGridProps {
  schedules: Record<string, string[]>;
  onSchedulesChange: (schedules: Record<string, string[]>) => void;
  timezone: string;
}

export function WeeklyScheduleGrid({ schedules, onSchedulesChange, timezone }: WeeklyScheduleGridProps) {
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  const days = [
    { key: "monday", label: "Monday", short: "Mon" },
    { key: "tuesday", label: "Tuesday", short: "Tue" },
    { key: "wednesday", label: "Wednesday", short: "Wed" },
    { key: "thursday", label: "Thursday", short: "Thu" },
    { key: "friday", label: "Friday", short: "Fri" },
    { key: "saturday", label: "Saturday", short: "Sat" },
    { key: "sunday", label: "Sunday", short: "Sun" },
  ];

  const toggleDay = (day: string) => {
    setActiveDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const addTimeSlot = (day: string, time: string) => {
    onSchedulesChange({
      ...schedules,
      [day]: [...schedules[day], time]
    });
  };

  const removeTimeSlot = (day: string, timeIndex: number) => {
    onSchedulesChange({
      ...schedules,
      [day]: schedules[day].filter((_, index) => index !== timeIndex)
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
        {days.map((day) => (
          <Card key={day.key} className={`transition-all ${
            activeDays[day.key] ? "ring-2 ring-primary/20" : "opacity-60"
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{day.label}</CardTitle>
                <Switch
                  checked={activeDays[day.key]}
                  onCheckedChange={() => toggleDay(day.key)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeDays[day.key] && (
                <div className="space-y-2">
                  {/* Existing time slots */}
                  {schedules[day.key]?.map((time, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md px-2 py-1">
                      <span className="text-sm font-mono">{time}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTimeSlot(day.key, index)}
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Quick add buttons */}
                  <div className="flex flex-wrap gap-1">
                    {["09:00", "14:00", "18:00"].map((time) => (
                      <Button
                        key={time}
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(day.key, time)}
                        className="h-6 text-xs px-2"
                        disabled={schedules[day.key]?.includes(time)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {!activeDays[day.key] && (
                <div className="text-center py-4">
                  <span className="text-xs text-muted-foreground">Day disabled</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <span>
          Active: {Object.values(activeDays).filter(Boolean).length} days
        </span>
        <span>
          Total deliveries: {Object.entries(schedules).reduce((total, [day, times]) => 
            activeDays[day] ? total + times.length : total, 0
          )} per week
        </span>
      </div>
    </div>
  );
}
