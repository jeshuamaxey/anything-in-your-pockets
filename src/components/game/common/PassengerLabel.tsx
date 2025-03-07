import React from 'react';
import { Passenger } from '@/types/gameTypes';
import LabelProgressBar from './LabelProgressBar';

interface PassengerLabelProps {
  passenger: Passenger;
  onClick?: (passenger: Passenger) => void;
  showProgress?: boolean;
  progress?: number;
}

export const PassengerLabel = ({
  passenger,
  onClick,
  showProgress = false,
  progress = 0
}: PassengerLabelProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(passenger);
    }
  };

  return (
    <div className="bg-white rounded">
      <div 
        className={`w-full text-[11px] flex flex-col px-1 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={handleClick}
        >
        <div className="flex items-center gap-1 justify-between">
          <span className="font-mono flex-1">
            {passenger.emoji} {passenger.id.slice(-3)}
            {passenger.has_bag ? <span title="Has bags"> 🧳</span> : <span title="No bags"> 🏃‍♂️</span>}
          </span>
          {showProgress && <LabelProgressBar progress={progress} color="green" />}
        </div>
      </div>
    </div>
  );
}; 