import React from 'react';
import { Passenger } from '@/types/gameTypes';
import { formatTimestamp } from '@/lib/utils';

interface PassengerLabelProps {
  passenger: Passenger;
  onClick?: (passenger: Passenger) => void;
  showDetails?: boolean;
  showTimestamp?: boolean;
}

export const PassengerLabel = ({
  passenger,
  onClick,
  showDetails = false,
  showTimestamp = false
}: PassengerLabelProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(passenger);
    }
  };

  return (
    <div 
      className={`flex flex-col ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={handleClick}
      >
      <div className="flex items-center gap-2">
        <span className="font-mono">passenger {passenger.id.slice(-3)}</span>
        {passenger.has_bag ? <span title="Has bags">🧳</span> : <span title="No bags">🏃‍♂️</span>}
      </div>
      
      {showDetails && (
        <div className="text-xs text-gray-600 mt-1">
          {showTimestamp && passenger.spawned_timestamp && (
            <div>
              Spawned: {formatTimestamp(passenger.spawned_timestamp)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 