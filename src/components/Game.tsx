'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import TopControlBar from './game/layout/TopControlBar';
import useGameState from '@/hooks/useGameState';
import SecurityQueue from './game/layout/SecurityQueue';
import { SecurityLanesColumn } from './game/layout/SecurityLanesColumn';
import SystemStatus from './game/common/SystemStatus';
import { assignPassengerToLane, startGame } from '@/lib/game-logic';
import GameOverlay from './game/layout/GameOverlay';
import { initializeGameState } from '@/hooks/useGameState';
import BottomControlBar from './game/layout/BottomControlBar';

const Game = () => {
  const [gameState, setGameState] = useGameState()
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Toggle game (start/pause) - move this before the useEffect that uses it
  const toggleGame = useCallback(() => {
    // Don't allow toggling while overlay is shown
    if (showOverlay) return;

    if (gameLoopRef.current) {
      // Game is running, pause it
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
      
      setGameState(prevState => ({
        ...prevState,
        paused: true
      }));
    } else {
      // Kickoff the game
      startGame(gameState, setGameState, gameLoopRef);
    }
  }, [gameState, setGameState, showOverlay]);

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      /**
       * TOGGLE PLAY/PAUSE
       */
      // Handle play/pause with 'p' key
      if (event.key.toLowerCase() === 'p') {
        toggleGame();
        return;
      }

      /**
       * ASSIGN PASSENGERS TO LANES
       */
      // Check if the pressed key is a number between 1-9
      const laneNumber = parseInt(event.key);
      if (!isNaN(laneNumber) && laneNumber >= 1 && laneNumber <= 9) {
        // Get the lane index (0-based)
        const laneIndex = laneNumber - 1;
        
        // Check if the lane exists
        if (laneIndex < gameState.security_lanes.length) {
          // Get the first passenger from the main queue
          const nextPassenger = gameState.main_queue.peek();
          if (nextPassenger) {
            assignPassengerToLane(gameState, setGameState, nextPassenger.id, gameState.security_lanes[laneIndex].id);
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, setGameState, toggleGame]);

  // Ensure the game is properly initialized
  useEffect(() => {
    // Make sure the game is paused on initial load
    setGameState(prevState => ({
      ...prevState,
      paused: true
    }));
  }, [setGameState]); // Add setGameState to dependency array
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  // Modify handleOverlayClose to reset game over state
  const handleOverlayClose = () => {
    setShowOverlay(false);
    
    // Start the game when overlay closes
    // Kickoff the game
    setGameState(initializeGameState());
    startGame(gameState, setGameState, gameLoopRef);
  };

  // Add new effect to watch for game over
  useEffect(() => {
    if (gameState.game_over && gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      setShowOverlay(true);
      gameLoopRef.current = null;
    }
  }, [gameState.game_over]);

  return (
    // Make this the full viewport height and width, and prevent overflow
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {showOverlay && (
        <GameOverlay 
          onClose={handleOverlayClose}
          isGameOver={gameState.game_over}
          gameState={gameState.game_over ? gameState : undefined}
        />
      )}
      
      {/* Fixed height header */}
      <div className="flex-none">
        <TopControlBar
          gameState={gameState}
          toggleGame={toggleGame}
          setGameState={setGameState}
        />
      </div>

      {/* Main content area - fills remaining height */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0"> {/* min-h-0 is crucial for nested flex scrolling */}
        {/* Left Column - Security Queue */}
        <div className="w-full md:w-1/5 border-r border-gray-300 overflow-y-auto">
          <SecurityQueue
            gameState={gameState} 
            setGameState={setGameState}
          />
        </div>

        {/* Center Column - Security Lanes */}
        <div className="w-full md:w-3/5 overflow-y-auto">
          <SecurityLanesColumn 
            gameState={gameState} 
            setGameState={setGameState}
          />
        </div>

        {/* Right Column - System Status */}
        <div className="hidden md:block w-1/5 border-l border-gray-300 overflow-y-auto p-2">
          <SystemStatus 
            gameState={gameState}
            setGameState={setGameState}
          />
        </div>
      </div>

      <div className="flex-none">
        <BottomControlBar />
      </div>
    </div>
  );
};

export default Game; 