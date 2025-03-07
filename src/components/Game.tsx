'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  Passenger,
} from '@/types/gameTypes';
import {
  GAME_TICK_MS,
  INITIAL_PASSENGERS,
  // UNLOADING_ASSISTANCE_THRESHOLD
} from '@/lib/game-constants';
import TopControlBar from './game/layout/TopControlBar';
import useGameState from '@/hooks/useGameState';
import { generateRandomBag } from '@/lib/game-generators';
import { generateRandomPassenger } from '@/lib/game-generators';
import SecurityQueue from './game/layout/SecurityQueue';
import { SecurityLanesColumn } from './game/layout/SecurityLanesColumn';
import SystemStatusColumn from './game/layout/SystemStatusColumn';
import { generatePassengerId } from '@/lib/game-utils';
import { assignPassengerToLane } from '@/lib/game-logic';
import { getTick } from '@/lib/game-loop';
const Game = () => {
  const [gameState, setGameState] = useGameState()
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  
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
  }, [gameState, setGameState]);

  // Ensure the game is properly initialized
  useEffect(() => {
    // Make sure the game is paused on initial load
    setGameState(prevState => ({
      ...prevState,
      paused: true
    }));
  }, []); // Empty dependency array - only run once on mount

  // Helper function to create and add a passenger to the game state
  const createAndAddPassenger = () => {
    const timestamp = Date.now();
    const passengerId = generatePassengerId(timestamp)
    const newPassenger = generateRandomPassenger(passengerId);
    
    // Set the spawned timestamp
    newPassenger.spawned_timestamp = timestamp;
    
    // Create a bag for the passenger if they have one
    if (newPassenger.has_bag) {
      console.log(`Creating bag for passenger ${passengerId}:`, {
        has_bag: newPassenger.has_bag,
        passenger_name: newPassenger.name
      });
      newPassenger.bag = generateRandomBag(passengerId, newPassenger.name);
      newPassenger.bag_on_person = true; // Initially the bag is with the passenger
    } else {
      newPassenger.bag = null;
      newPassenger.bag_on_person = false;
    }
    
    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Check if passenger already exists in the state
      const passengerExists = newState.passengers.some(p => p.id === passengerId);
      if (passengerExists) {
        console.warn(`Passenger ${passengerId} already exists in state!`);
        return newState; // Return unchanged state
      }
      
      // Add passenger to the passengers list
      newState.passengers = [...newState.passengers, newPassenger];
      
      // Add passenger to the main queue
      if (!newState.main_queue.findById(passengerId)) {
        newState.main_queue.enqueue(newPassenger);
      }
      
      // Update last spawn time
      newState.last_spawn_time = timestamp;
      
      return newState;
    });
  };
  
  // Toggle game (start/pause)
  const toggleGame = () => {
    if (gameLoopRef.current) {
      // Game is running, pause it
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
      
      setGameState(prevState => ({
        ...prevState,
        paused: true
      }));
    } else {
      if(gameState.time === 0) {
        // Spawn initial passengers
        const initialPassengers = Math.min(INITIAL_PASSENGERS, gameState.main_queue.capacity);
        for(let i = 0; i < initialPassengers; i++) {
          createAndAddPassenger();
        }
      }

      setGameState(prevState => ({
        ...prevState,
        paused: false
      }));
      
      // Start the game loop
      const tick = getTick(gameState, setGameState);
      gameLoopRef.current = setInterval(tick, GAME_TICK_MS);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col flex-1 min-w-full min-h-0"> {/* min-h-0 is crucial for flex child scrolling */}
      {/* Top Controls Bar */}
      <TopControlBar
        gameState={gameState}
        toggleGame={toggleGame}
        setGameState={setGameState}
      />

      {/* Main UI */}
      <div className="flex flex-1 ">
        {/* Left Column - Security Queue */}
        <div className="w-1/5 border-r border-gray-300 flex flex-col min-h-0"> {/* min-h-0 allows flex child to scroll */}
          <SecurityQueue setSelectedPassenger={setSelectedPassenger} gameState={gameState} setGameState={setGameState} />
        </div>

        {/* Center Column - Security Lanes */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main Content Area - Scrollable */}
          <SecurityLanesColumn onSelectPassenger={setSelectedPassenger} gameState={gameState} />
        </div>

        {/* Right Column - System Status */}
        <div className="w-1/5 border-l border-gray-300 flex flex-col min-h-0 p-2">
          <SystemStatusColumn gameState={gameState} selectedPassenger={selectedPassenger} setSelectedPassenger={setSelectedPassenger} />
        </div>
      </div>
    </div>
  );
};

export default Game; 