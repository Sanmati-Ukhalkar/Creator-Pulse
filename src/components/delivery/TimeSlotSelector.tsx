import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sunrise, Sun, Sunset } from "lucide-react";

export function TimeSlotSelector() {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const timeSlots = [
    { id: "morning", label: "Morning", time: "9:00 AM", icon: Sunrise },
    { id: "afternoon", label: "Afternoon", time: "2:00 PM", icon: Sun },
    { id: "evening", label: "Evening", time: "6:00 PM", icon: Sunset },
  ];

  const toggleSlot = (slotId: string) => {
    setSelectedSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {timeSlots.map((slot) => {
          const Icon = slot.icon;
          const isSelected = selectedSlots.includes(slot.id);
          
          return (
            <Button
              key={slot.id}
              variant={isSelected ? "default" : "outline"}
              onClick={() => toggleSlot(slot.id)}
              className={`justify-start h-auto p-3 ${
                isSelected ? "bg-creator-gradient hover:bg-creator-gradient-secondary" : ""
              }`}
            >
              <Icon className="h-4 w-4 mr-3" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{slot.label}</span>
                <span className="text-xs opacity-70">{slot.time}</span>
              </div>
            </Button>
          );
        })}
      </div>
      
      {selectedSlots.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedSlots.map(slotId => {
            const slot = timeSlots.find(s => s.id === slotId);
            return (
              <Badge key={slotId} variant="secondary" className="text-xs">
                {slot?.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}