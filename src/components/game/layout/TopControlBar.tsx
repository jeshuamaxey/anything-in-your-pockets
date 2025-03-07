import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { formatTime } from '@/lib/game-utils';
import { GameState } from '@/types/gameTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Settings } from 'lucide-react';
import { GAME_OVER_TIMEOUT_MS } from '@/lib/game-constants';
import { toggleSoundFX, toggleAmbientSound, isSoundFXEnabled, isAmbientSoundEnabled } from '@/lib/audio-utils';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  const [soundFXOn, setSoundFXOn] = useState(isSoundFXEnabled());
  const [ambientOn, setAmbientOn] = useState(isAmbientSoundEnabled());

  const handleSoundFXToggle = () => {
    const isEnabled = toggleSoundFX();
    setSoundFXOn(isEnabled);
  };

  const handleAmbientToggle = () => {
    const isEnabled = toggleAmbientSound();
    setAmbientOn(isEnabled);
  };

  return (
    <div className="flex justify-between items-center border-b border-gray-300 p-4">
      <div className="text-sm py-1 font-['Press_Start_2P'] text-blue-800">
        ANYTHING IN YOUR POCKETS?
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Game Settings</DialogTitle>
              <DialogDescription>
                Configure your game experience
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Sound</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure game audio settings
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="sound-fx" className="flex flex-col gap-1">
                      <span>Sound Effects</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Beeps and interaction sounds
                      </span>
                    </Label>
                    <Switch
                      id="sound-fx"
                      checked={soundFXOn}
                      onCheckedChange={handleSoundFXToggle}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="ambient" className="flex flex-col gap-1">
                      <span>Ambient Sound</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Background airport noise
                      </span>
                    </Label>
                    <Switch
                      id="ambient"
                      checked={ambientOn}
                      onCheckedChange={handleAmbientToggle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Error Dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="relative"
              onClick={() => setErrorDialogOpen(true)}
            >
              <AlertCircle className="h-4 w-4" />
              {gameState.errors.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {gameState.errors.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>System Errors</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {gameState.errors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No errors to display</p>
              ) : (
                <div className="space-y-2">
                  {gameState.errors.map((error, index) => (
                    <div key={index} className="bg-destructive/10 border border-destructive/20 rounded p-2">
                      <p className="text-sm text-destructive">{error.message}</p>
                      <p className="text-xs text-destructive/70 mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  <Button variant="destructive" onClick={() => setGameState({...gameState, errors: []})}>
                    Clear Errors
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {gameState.queue_at_capacity_start_time && (
          <p className="text-sm font-mono text-destructive">
            {(Math.max(0, GAME_OVER_TIMEOUT_MS - (Date.now() - gameState.queue_at_capacity_start_time)) / 1000).toFixed(1)}s left
          </p>
        )}

        <Button 
          onClick={toggleGame}
          variant={gameState.paused ? "default" : "secondary"}
          className={cn(
            "w-24",
            gameState.paused && "bg-green-500 hover:bg-green-600 text-white",
            !gameState.paused && "bg-yellow-500 hover:bg-yellow-600 text-white"
          )}
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