import React from 'react';
import { GameState } from '@/types/gameTypes';
import SecurityLaneUI from '../common/SecurityLane';

interface SecurityLanesColumnProps {
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
}

export const SecurityLanesColumn = ({
  gameState,
  setGameState,
}: SecurityLanesColumnProps) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Security Lanes */}
      <div className="flex flex-col">
        {/* Security Lanes */}
        {gameState.security_lanes.map((lane) => {
          return (
            <SecurityLaneUI 
              key={lane.id} 
              lane={lane} 
              gameState={gameState} 
              setGameState={setGameState} 
            />
          )
        })}
      </div>
    </div>
  );
}; 