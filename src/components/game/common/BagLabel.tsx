import React from 'react';
import { Bag } from '@/types/gameTypes';
import LabelProgressBar from './LabelProgressBar';

interface BagLabelProps {
  bag: Bag;
  onClick?: (bag: Bag) => void;
  showProgress?: boolean;
  progress?: number;
}

export const BagLabel = ({
  bag,
  onClick,
  showProgress = false,
  progress = 0
}: BagLabelProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(bag);
    }
  };

  return (
    <div className="bg-white rounded w-full">
      <div 
        className={`w-full text-[11px] flex items-center justify-between gap-1 px-1 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={handleClick}
        >
        <div className="flex flex-1 items-center gap-2">
          <span className="font-mono">bag {bag.id.slice(-3)}</span>
        </div>
        {showProgress && <LabelProgressBar progress={progress} color="blue" />}
      </div>
    </div>
  );
};

