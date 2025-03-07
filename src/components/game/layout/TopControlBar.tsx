import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { formatTime } from '@/lib/game-utils';
import { GameState } from '@/types/gameTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle } from 'lucide-react';
import { GAME_OVER_TIMEOUT_MS } from '@/lib/game-constants';

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
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex justify-between items-center border-b border-gray-300 p-4">
      <div className="text-sm py-1 font-['Press_Start_2P'] text-blue-800">
        ANYTHING IN YOUR POCKETS?
      </div>
      
      <div className="flex items-center space-x-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="relative"
              onClick={() => setDialogOpen(true)}
            >
              <AlertCircle className="h-4 w-4" />
              {gameState.errors.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {gameState.errors.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>System Errors</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {gameState.errors.length === 0 ? (
                <p className="text-gray-500 text-sm">No errors to display</p>
              ) : (
                <div className="space-y-2">
                  {gameState.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">{error.message}</p>
                      <p className="text-xs text-red-500 mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  <Button onClick={() => setGameState({...gameState, errors: []})}>Clear Errors</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {gameState.queue_at_capacity_start_time && (<p className="text-sm font-mono text-red-500">
          {(Math.max(0, GAME_OVER_TIMEOUT_MS - (Date.now() - gameState.queue_at_capacity_start_time)) / 1000).toFixed(1)}s left
        </p>)}

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