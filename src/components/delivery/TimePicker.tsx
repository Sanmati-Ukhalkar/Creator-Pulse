import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock } from "lucide-react";

export function TimePicker() {
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  const handleAddTime = () => {
    const time = `${hour}:${minute} ${ampm}`;
    // TODO: Add to schedule
    console.log("Adding time:", time);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label htmlFor="hour" className="text-xs">Hour</Label>
          <Input
            id="hour"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            placeholder="09"
            maxLength={2}
            className="text-center"
          />
        </div>
        <span className="text-muted-foreground mt-5">:</span>
        <div className="flex-1">
          <Label htmlFor="minute" className="text-xs">Minute</Label>
          <Input
            id="minute"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            placeholder="00"
            maxLength={2}
            className="text-center"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Period</Label>
          <div className="flex rounded-md border">
            <button
              type="button"
              onClick={() => setAmpm("AM")}
              className={`flex-1 px-3 py-2 text-sm rounded-l-md transition-colors ${
                ampm === "AM" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setAmpm("PM")}
              className={`flex-1 px-3 py-2 text-sm rounded-r-md transition-colors ${
                ampm === "PM" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>
      
      <Button onClick={handleAddTime} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Add Time Slot
      </Button>
    </div>
  );
}