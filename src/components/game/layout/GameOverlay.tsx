'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { GameState } from '@/types/gameTypes';
import { formatDuration } from '@/lib/game-utils';

interface GameOverlayProps {
  onClose: () => void;
  isGameOver?: boolean;
  gameState?: GameState;
}

const GameOverlay = ({ onClose, isGameOver, gameState }: GameOverlayProps) => {
  const elapsedTime = gameState?.game_over_time ? (gameState.game_over_time - gameState.game_start_time!) / 1000 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {isGameOver ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-red-600">Game Over!</h2>
            <p className="text-center mb-6">The main queue was at capacity for too long!</p>
            
            {gameState && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Game Statistics</h3>
                <ul className="space-y-2">
                  <li>Time Elapsed: {formatDuration(elapsedTime)}</li>
                  
                  <li>Passengers Processed: {gameState.completed.length}</li>
                </ul>
              </div>
            )}
            
            <div className="mt-8 flex justify-center">
              <Button 
                onClick={onClose}
                className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Try Again
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center">Welcome to Airport Security!</h2>
            
            <div className="space-y-6">
              <section>
                <h3 className="text-xl font-semibold mb-3">Game Objectives</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Keep security operations running smoothly</li>
                  <li>Manage passenger queues efficiently</li>
                  <li>Ensure passengers remain happy by processing them quickly</li>
                  <li>Monitor and maintain security standards</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-3">Keyboard Controls</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Lane Assignment</h4>
                    <ul className="space-y-2">
                      <li>
                        <kbd className="px-2 py-1 bg-gray-100 rounded">1</kbd> - Assign to Lane 1
                      </li>
                      <li>
                        <kbd className="px-2 py-1 bg-gray-100 rounded">2</kbd> - Assign to Lane 2
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Game Control</h4>
                    <ul className="space-y-2">
                      <li>
                        <kbd className="px-2 py-1 bg-gray-100 rounded">P</kbd> - Play/Pause Game
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8 flex justify-center">
              <Button 
                onClick={onClose}
                className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Start Game
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameOverlay; 
