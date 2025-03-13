import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { GameState } from '@/types/gameTypes';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { GAME_OVER_TIMEOUT_MS } from '@/lib/game-constants';
import SettingsDialog from '@/components/game/layout/SettingsDialog';
import ErrorDialog from './ErrorDialog';
import useDebug from '@/hooks/useDebug';
import SystemStatsDialog from './SystemStatsDialog';
interface TopControlBarProps {
  gameState: GameState;
  toggleGame: () => void;
  setGameState: (gameState: GameState) => void;
}

const TopControlBar = ({
  gameState,
  setGameState,
  toggleGame
}: TopControlBarProps) => {

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemStatsOpen, setSystemStatsOpen] = useState(false);

  return (
    <div className="flex justify-between items-center border-b border-gray-300 p-2">
      <div className="text-xs py-1 font-['Press_Start_2P'] text-blue-800">
        ANYTHING IN<br className="md:hidden" /> YOUR POCKETS?
      </div>
      
      <div className="flex items-center space-x-2">
        {gameState.queue_at_capacity_start_time && (
          <p className="text-sm font-mono text-destructive">
            {(Math.max(0, GAME_OVER_TIMEOUT_MS - (Date.now() - gameState.queue_at_capacity_start_time)) / 1000).toFixed(1)}s left
          </p>
        )}

        {/* Settings Dialog */}
        <SettingsDialog 
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
        />

        {/* System Stats Dialog */}
        <SystemStatsDialog 
          systemStatsOpen={systemStatsOpen}
          setSystemStatsOpen={setSystemStatsOpen}
          gameState={gameState}
        />

        {/* Error Dialog */}
        {useDebug() && (
          <ErrorDialog 
            errorDialogOpen={errorDialogOpen}
            setErrorDialogOpen={setErrorDialogOpen}
            gameState={gameState}
            setGameState={setGameState}
          />
        )}

        <Button 
          onClick={toggleGame}
          variant="outline"
        >
          {gameState.paused ? <PlayIcon /> : <PauseIcon />}
        </Button>
        
        {/* <div className="text-lg font-bold">
          {formatTime(gameState.time)}
        </div> */}
      </div>
    </div>
  );
}

export default TopControlBar;