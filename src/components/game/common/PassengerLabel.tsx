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
    <div 
      className={`
        w-full text-xs flex flex-col px-1
        ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        `}
      onClick={handleClick}
      >
      <div className="flex gap-1 justify-between font-mono flex-1">
        {passenger.emoji} {passenger.id.slice(-3)}
        {passenger.has_bag ? <span title="Has bags"> 🧳</span> : null}
        {showProgress && <LabelProgressBar progress={progress} color="green" />}
      </div>
    </div>

  );
}; 