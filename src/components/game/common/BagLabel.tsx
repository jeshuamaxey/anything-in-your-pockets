import React from 'react';
import { Bag } from '@/types/gameTypes';
import LabelProgressBar from './LabelProgressBar';

interface BagLabelProps {
  bag: Bag;
  onClick?: (bag: Bag) => void;
  showProgress?: boolean;
  progress?: number;
  annotation?: string;
}

export const BagLabel = ({
  bag,
  onClick,
  showProgress = false,
  progress = 0,
  annotation = ''
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
          <span className="font-mono">💼 {bag.id.slice(-3)}</span>
        </div>
        {showProgress && <LabelProgressBar progress={progress} color="blue" />}
        {annotation && <span className="text-xs text-gray-500">{annotation}</span>}
      </div>
    </div>
  );
};

