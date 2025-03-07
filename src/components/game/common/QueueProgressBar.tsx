import React from 'react';
import { Progress } from "@/components/ui/progress";

interface QueueProgressBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
}

export const QueueProgressBar = ({
  current,
  max,
  showLabel = false
}: QueueProgressBarProps) => {
  const percentage = Math.min((current / max) * 100, 100);
  const color = percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span>Queue Capacity</span>
          <span>{current}/{max}</span>
        </div>
      )}
      <Progress 
        value={percentage} 
        className={`h-2 ${color}`}
      />
    </div>
  );
}; 