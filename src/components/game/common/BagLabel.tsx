import React from 'react';
import { Bag } from '@/types/gameTypes';
import LabelProgressBar from './LabelProgressBar';

interface BagLabelProps {
  bag: Bag;
  showProgress?: boolean;
  progress?: number;
  annotation?: string;
  onClick?: (bag: Bag) => void;
  showAlerts?: boolean;
  alerts?: {
    suspiciousItemAlert: boolean;
    electronicsAlert: boolean;
    liquidsAlert: boolean;
  };
}

export const BagLabel = ({
  bag,
  showProgress = false,
  progress = 0,
  annotation = '',
  showAlerts = false,
  alerts = {
    suspiciousItemAlert: false,
    electronicsAlert: false,
    liquidsAlert: false,
  },
  onClick,
}: BagLabelProps) => {

  const handleClick = () => {
    if (showAlerts && onClick) {
      onClick(bag);
    }
  };

  const anyAlert = alerts.suspiciousItemAlert || alerts.electronicsAlert || alerts.liquidsAlert
  const allAlertsDealtWith = true
    && alerts.suspiciousItemAlert ? bag.suspicious_item_dealt_with : true
    && alerts.electronicsAlert ? bag.electronics_alert_dealt_with : true
    && alerts.liquidsAlert ? bag.liquids_alert_dealt_with : true

  return (
    <div className="bg-white rounded w-full"
      onClick={handleClick}
      >
      <div 
        className={`w-full text-[11px] flex items-center justify-between gap-1 px-1 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      >
        <div className="flex flex-1 items-center gap-2">
          <span className="font-mono">💼 {bag.id.slice(-3)}</span>
          {showAlerts && alerts.suspiciousItemAlert && !bag.suspicious_item_dealt_with && <span className="text-xs text-red-500">🚨</span>}
          {showAlerts && alerts.electronicsAlert && !bag.electronics_alert_dealt_with && <span>💻</span>}
          {showAlerts && alerts.liquidsAlert && !bag.liquids_alert_dealt_with && <span>🧃</span>}
          {showAlerts && anyAlert && allAlertsDealtWith && <span className="text-xs text-green-500">✅</span>}
        </div>
        {showProgress && <LabelProgressBar progress={progress} color="blue" />}
        {annotation && <span className="text-xs text-gray-500">{annotation}</span>}
      </div>
    </div>
  );
};

