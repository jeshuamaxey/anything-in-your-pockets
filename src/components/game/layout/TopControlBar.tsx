import React from 'react';
import { Button } from "@/components/ui/button";
import { formatTime } from '@/lib/game-utils';
import { GameState } from '@/types/gameTypes';

interface TopControlBarProps {
  gameState: GameState;
  toggleGame: () => void;
}

const TopControlBar = ({
  gameState,
  toggleGame
}: TopControlBarProps) => {
  return (
    <div className="flex justify-between items-center border-b border-gray-300 p-4">
      <div className="text-sm py-1 font-['Press_Start_2P'] text-blue-800">
        ANYTHING IN YOUR POCKETS?
      </div>
      
      <div className="flex items-center space-x-4">
        <Button 
          onClick={toggleGame}
          className={`w-24 ${gameState.paused ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}`}
        >
          {gameState.paused ? "PLAY" : "PAUSE"}
        </Button>
        
        <div className="text-lg font-bold">
          {formatTime(gameState.time)}
        </div>
      </div>
    </div>
  );

}

export default TopControlBar;