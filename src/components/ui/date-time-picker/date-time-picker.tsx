import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
}

function TimeSelect({ 
  value, 
  onChange 
}: { 
  value: Date | undefined; 
  onChange: (date: Date | undefined) => void; 
}) {
  const handleHourChange = (hour: string) => {
    if (!value) return;
    
    const newDate = new Date(value);
    newDate.setHours(parseInt(hour));
    onChange(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    if (!value) return;
    
    const newDate = new Date(value);
    newDate.setMinutes(parseInt(minute));
    onChange(newDate);
  };

  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
  const minutes = [0, 15, 30, 45]; // 15-minute intervals

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Hour</span>
        <Select
          value={value ? value.getHours().toString() : undefined}
          onValueChange={handleHourChange}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour.toString()}>
                {hour <= 12 ? hour : hour - 12}{hour < 12 ? " AM" : " PM"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Minute</span>
        <Select
          value={value ? value.getMinutes().toString() : undefined}
          onValueChange={handleMinuteChange}
        >
          <SelectTrigger className="w-[90px]">
            <SelectValue placeholder="Minute" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((minute) => (
              <SelectItem key={minute} value={minute.toString()}>
                {minute === 0 ? "00" : minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DateTimePicker({ value, onChange, minDate }: DateTimePickerProps) {
  const today = new Date();
  
  const minTime = React.useMemo(() => {
    if (minDate && minDate.toDateString() === today.toDateString()) {
      // If minDate is today, we need to disable past hours
      return minDate;
    }
    return undefined;
  }, [minDate, today]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP p") // e.g., "Apr 21, 2023, 2:30 PM"
          ) : (
            <span>Pick a date and time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            // If we have a current value, preserve the time
            if (date && value) {
              const newDate = new Date(date);
              newDate.setHours(value.getHours());
              newDate.setMinutes(value.getMinutes());
              onChange(newDate);
            } else if (date) {
              // Set default time to noon if no previous time
              const newDate = new Date(date);
              newDate.setHours(12);
              newDate.setMinutes(0);
              onChange(newDate);
            } else {
              onChange(undefined);
            }
          }}
          initialFocus
          disabled={(date) => {
            // Disable dates before today
            return date < new Date((minDate || today).setHours(0, 0, 0, 0));
          }}
          captionLayout="dropdown-buttons"
          fromYear={today.getFullYear()}
          toYear={today.getFullYear() + 1}
        />
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Select time</span>
          </div>
          <TimeSelect value={value} onChange={onChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateTimePicker;