import React from 'react';
import { Bag } from '@/types/gameTypes';
import LabelProgressBar from './LabelProgressBar';

interface BagLabelProps {
  bag: Bag;
  showProgress?: boolean;
  progress?: number;
  annotation?: string;
  suspicionIndicator?: boolean;
  onClick?: (bag: Bag) => void;
}

export const BagLabel = ({
  bag,
  showProgress = false,
  progress = 0,
  annotation = '',
  suspicionIndicator = false,
  onClick,
}: BagLabelProps) => {
  const handleClick = () => {
    if (suspicionIndicator && onClick) {
      onClick(bag);
    }
  };

  return (
    <div className="bg-white rounded w-full"
      onClick={handleClick}
      >
      <div 
        className={`w-full text-[11px] flex items-center justify-between gap-1 px-1 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      >
        <div className="flex flex-1 items-center gap-2">
          <span className="font-mono">💼 {bag.id.slice(-3)}</span>
          {suspicionIndicator && !bag.suspicion_dealt_with && <span className="text-xs text-red-500">🚨</span>}
          {suspicionIndicator && bag.suspicion_dealt_with && <span className="text-xs text-green-500">✅</span>}
        </div>
        {showProgress && <LabelProgressBar progress={progress} color="blue" />}
        {annotation && <span className="text-xs text-gray-500">{annotation}</span>}
      </div>
    </div>
  );
};

