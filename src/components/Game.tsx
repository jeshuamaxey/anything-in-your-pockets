'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  GameState, 
  Passenger,
} from '@/types/gameTypes';
import {
  GAME_TICK_MS,
  HISTOGRAM_INTERVAL,
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
import { normalDistribution } from '@/lib/game-utils';
import { generatePassengerId } from '@/lib/game-utils';
import { assignPassengerToLane } from '@/lib/game-logic';
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
      gameLoopRef.current = setInterval(() => {
        // const loopStartTime = performance.now();
        // console.log(`Game loop starting at ${loopStartTime}`);
        
        // Update game time and process everything in a single state update
        setGameState(prevState => {
          // const updateStartTime = performance.now();
          const newState = { ...prevState };
          const currentTime = Date.now();
          
          // Update game time
          newState.time = prevState.time + (GAME_TICK_MS / 1000);
          
          // Update histogram data to ensure all intervals exist
          newState.histogram_data = updateHistogramData(prevState);
          
          // Check if it's time to spawn a new passenger
          const timeSinceLastSpawn = currentTime - newState.last_spawn_time;
          const spawnInterval = (60 * 1000) / newState.spawn_rate; // Convert spawn rate to milliseconds
          
          // Only spawn a new passenger if enough time has passed since the last spawn
          if (timeSinceLastSpawn >= spawnInterval) {
            const passengerId = generatePassengerId(currentTime)
            const newPassenger = generateRandomPassenger(passengerId);
            newPassenger.spawned_timestamp = currentTime;
            
            // Create a bag for the passenger if they have one
            if (newPassenger.has_bag) {
              newPassenger.bag = generateRandomBag(passengerId, newPassenger.name);
              newPassenger.bag_on_person = true; // Initially the bag is with the passenger
            } else {
              newPassenger.bag = null;
              newPassenger.bag_on_person = false;
            }
            
            // Add passenger to the passengers list
            newState.passengers = [...newState.passengers, newPassenger];
            
            // Add passenger to the main queue
            if (!newState.main_queue.findById(passengerId)) {
              newState.main_queue.enqueue(newPassenger);
            }
            
            // Update the last spawn time
            newState.last_spawn_time = currentTime;
          }
          
          // Process security lanes directly here instead of calling processSecurityLanes()
          // console.time('processLanes');
          newState.security_lanes = newState.security_lanes.map(lane => {
            // const laneStartTime = performance.now();
            const updatedLane = { ...lane };
            
            // 1. Process lane_line - move passengers to either bag_drop_line or body_scan_line
            if (updatedLane.lane_line.length > 0) {
              const passenger = updatedLane.lane_line.peek();
              
              if (passenger) {
                if (passenger.has_bag) {
                  // Move to bag drop line if there's space
                  if (updatedLane.bag_drop_line.length < updatedLane.bag_drop_line.capacity) {
                    // Remove from lane line and add to bag drop line
                    updatedLane.lane_line.dequeue();
                    updatedLane.bag_drop_line.enqueue(passenger);
                  }
                } else {
                  // No bag, try to move directly to body scanner line
                  if (updatedLane.body_scan_line.length < updatedLane.body_scan_line.capacity) {
                    updatedLane.lane_line.dequeue();
                    updatedLane.body_scan_line.enqueue(passenger);
                  }
                }
              }
            }
            
            // 2. Process bag_drop_line - move passengers to bag_drop_unload when space available
            if (updatedLane.bag_drop_line.length > 0) {
              const unloadingCount = updatedLane.bag_drop_unload.length;
              
              if (unloadingCount < updatedLane.bag_unloading_bays) {
                const passenger = updatedLane.bag_drop_line.peek();
                if (passenger) {
                  updatedLane.bag_drop_line.dequeue();
                  updatedLane.bag_drop_unload.enqueue(passenger);
                }
              }
            }
            
            // 3. Process bag_drop_unload - handle bag unloading progress
            const unloadingPassengers = updatedLane.bag_drop_unload.getAll();
            for (const passenger of unloadingPassengers) {
              // If passenger isn't already unloading, start the unloading process
              if (!passenger.unloading_bag) {
                passenger.unloading_bag = true;
                passenger.unloading_progress = 0;
                passenger.unloading_start_time = newState.time;
                passenger.bag_unload_started_timestamp = Date.now();
              }
              
              // Update unloading progress
              const unloadingSpeed = 100 +(passenger.security_familiarity); // 7-32% per second
              passenger.unloading_progress = (passenger.unloading_progress || 0) + (unloadingSpeed / 10) * (GAME_TICK_MS / 1000);
              
              // Check if unloading is complete
              if (passenger.unloading_progress >= 100) {
                // Mark bag as unloaded and no longer on person
                if (passenger.bag) {
                  passenger.bag.is_unloaded = true;
                  passenger.bag_on_person = false;
                  
                  // Add bag to scanner waiting queue
                  if (!updatedLane.bag_scanner.waiting_items.findById(passenger.bag.id)) {
                    updatedLane.bag_scanner.waiting_items.enqueue(passenger.bag);
                  }
                }
                
                // Record completion timestamp
                passenger.bag_unload_completed_timestamp = Date.now();
                
                // Reset unloading state
                passenger.unloading_bag = false;
                passenger.unloading_progress = 0;
                
                // Move to body scanner line if there's space
                if (updatedLane.body_scan_line.length < updatedLane.body_scan_line.capacity) {
                  updatedLane.bag_drop_unload.removeById(passenger.id);
                  updatedLane.body_scan_line.enqueue(passenger);
                  passenger.body_scanner_queue_joined_timestamp = Date.now();
                }
              }
            }
            
            // 4. Process body scanner line and scanner
            if (updatedLane.body_scanner.is_operational) {
              // Initialize scan tracking objects if they don't exist
              updatedLane.body_scanner.current_scan_progress = updatedLane.body_scanner.current_scan_progress || {};
              updatedLane.body_scanner.current_scan_time_needed = updatedLane.body_scanner.current_scan_time_needed || {};

              // Try to move passenger from line into scanner
              if (updatedLane.body_scan_line.length > 0 && 
                  updatedLane.body_scanner.current_items.length < updatedLane.body_scanner.capacity) {
                const passenger = updatedLane.body_scan_line.peek();

                if (passenger) {
                  // Start scanning the passenger
                  updatedLane.body_scanner.current_items.enqueue(passenger);
                  updatedLane.body_scanner.current_scan_progress[passenger.id] = 0;
                  passenger.body_scanner_started_timestamp = Date.now();

                  // Calculate scan time (between 0.5 and ~5 seconds)
                  const scanTimeSeconds = Math.max(0.5, normalDistribution(3, 1));
                  updatedLane.body_scanner.current_scan_time_needed[passenger.id] = scanTimeSeconds;
                  
                  // Remove from line
                  updatedLane.body_scan_line.dequeue();
                }
              }
              
              // Process passengers in scanner
              const currentItems = updatedLane.body_scanner.current_items.getAll();
              
              for (const passenger of currentItems) {
                // Get scan time needed (default 3 seconds if not set)
                const scanTimeNeeded = updatedLane.body_scanner.current_scan_time_needed[passenger.id] || 3;
                
                // Calculate progress increment (percentage per tick)
                const progressIncrement = (GAME_TICK_MS / 1000) * (100 / scanTimeNeeded);
                
                // Update progress, ensuring it doesn't exceed 100%
                const currentProgress = updatedLane.body_scanner.current_scan_progress[passenger.id] || 0;
                const newProgress = Math.min(100, currentProgress + progressIncrement);
                updatedLane.body_scanner.current_scan_progress[passenger.id] = newProgress;

                // Check if scan is complete
                if (newProgress >= 100) {
                  passenger.body_scanner_finished_timestamp = Date.now();
                  
                  // Remove from scanner and clean up tracking
                  updatedLane.body_scanner.current_items.removeById(passenger.id);
                  delete updatedLane.body_scanner.current_scan_progress[passenger.id];
                  delete updatedLane.body_scanner.current_scan_time_needed[passenger.id];
                  
                  if (passenger.has_bag) {
                    // Move to bag pickup area
                    passenger.waiting_for_bag_started_timestamp = Date.now();
                    updatedLane.bag_pickup_area.enqueue(passenger);
                  } else {
                    // No bag, move directly to completed
                    passenger.security_cleared_timestamp = Date.now();
                    updatedLane.passengers_completed.push(passenger);
                    newState.completed.push(passenger);
                    newState.histogram_data = incrementHistogramData(newState, newState.time);
                  }
                }
              }
            }
            
            // Process bag scanner
            if (updatedLane.bag_scanner.is_operational) {
              // Move bags from waiting queue to scanner if there's capacity
              while (updatedLane.bag_scanner.current_items.length < updatedLane.bag_scanner.capacity && 
                     updatedLane.bag_scanner.waiting_items.length > 0) {
                const nextBag = updatedLane.bag_scanner.waiting_items.peek();
                if (!nextBag) {
                  console.warn('No bag to add to scanner');
                  break;
                }
                
                // Find the passenger who owns this bag
                const passenger = newState.passengers.find(p => p.bag?.id === nextBag.id);
                if (passenger?.bag && !passenger.bag.is_being_scanned && !passenger.bag.scan_complete) {
                  // Remove from waiting queue
                  updatedLane.bag_scanner.waiting_items.dequeue();
                  
                  // Add to scanner
                  updatedLane.bag_scanner.current_items.enqueue(nextBag);
                  updatedLane.bag_scanner.current_scan_progress[nextBag.id] = 0;
                  
                  // Mark bag as being scanned
                  passenger.bag.is_being_scanned = true;
                  passenger.bag_scanner_started_timestamp = Date.now();
                } else {
                  // If bag is already being scanned or complete, just remove it from waiting queue
                  updatedLane.bag_scanner.waiting_items.dequeue();
                }
              }
              
              // Process bags in scanner
              const bagsInScanner = updatedLane.bag_scanner.current_items.getAll();

              for (const bag of bagsInScanner) {
                // Update scan progress
                const currentProgress = updatedLane.bag_scanner.current_scan_progress[bag.id] || 0;
                const progressIncrement = (updatedLane.bag_scanner.items_per_minute / 60) * (GAME_TICK_MS / 1000) * 100;
                const newProgress = Math.min(100, currentProgress + progressIncrement);
                updatedLane.bag_scanner.current_scan_progress[bag.id] = newProgress;
                
                // Check if scan is complete
                if (newProgress >= 100) {
                  // Find the passenger who owns this bag
                  const passenger = newState.passengers.find(p => p.bag?.id === bag.id);
                  if (passenger?.bag) {
                    // Update bag status and move to off ramp
                    passenger.bag.is_being_scanned = false;
                    passenger.bag.scan_complete = true;
                    passenger.bag_scanner_complete_timestamp = Date.now();
                    
                    // Check if bag should be flagged for inspection (20% chance)
                    // if (Math.random() < 0.2) {
                    //   passenger.bag.is_flagged = true;
                    //   console.log(`Bag ${bag.id} flagged for inspection`);
                    // }
                    
                    // Remove from scanner and add to off ramp
                    updatedLane.bag_scanner.current_items.removeById(bag.id);
                    delete updatedLane.bag_scanner.current_scan_progress[bag.id];
                    updatedLane.bag_scanner_off_ramp.enqueue(bag);
                    
                    // Check if passenger is waiting in bag pickup area
                    const waitingPassenger = updatedLane.bag_pickup_area.findById(passenger.id);
                    if (waitingPassenger) {
                      console.log(`Passenger ${passenger.id} was waiting for bag ${bag.id}, moving to completed`);
                      // Bag is scanned, passenger can pick it up
                      passenger.bag_on_person = true;
                      passenger.waiting_for_bag_finished_timestamp = Date.now();
                      passenger.security_cleared_timestamp = Date.now();
                      
                      // Move to completed
                      updatedLane.passengers_completed.push(passenger);
                      newState.completed.push(passenger);
                      
                      // Update histogram
                      newState.histogram_data = incrementHistogramData(newState, newState.time);
                      
                      // Remove from bag pickup area and off ramp
                      updatedLane.bag_pickup_area.removeById(passenger.id);
                      updatedLane.bag_scanner_off_ramp.removeById(bag.id);
                    } else {
                      console.log(`Bag ${bag.id} scan complete but passenger ${passenger.id} not yet in pickup area`);
                    }
                  }
                }
              }
            }
            
            // Process bag pickup area - check for completed bags
            if (updatedLane.bag_pickup_area.length > 0) {
              const waitingPassengers = updatedLane.bag_pickup_area.getAll();
              for (const passenger of waitingPassengers) {
                // Find passenger's bag in off ramp
                const completedBag = updatedLane.bag_scanner_off_ramp.findById(passenger.bag?.id || '');
                if (completedBag && passenger.bag?.scan_complete) {
                  console.log(`Found completed bag ${completedBag.id} for waiting passenger ${passenger.id}`);
                  // Reunite passenger with bag
                  passenger.bag_on_person = true;
                  passenger.waiting_for_bag_finished_timestamp = Date.now();
                  passenger.security_cleared_timestamp = Date.now();
                  
                  // Move to completed
                  updatedLane.passengers_completed.push(passenger);
                  newState.completed.push(passenger);
                  
                  // Update histogram
                  newState.histogram_data = incrementHistogramData(newState, newState.time);
                  
                  // Remove from bag pickup area and off ramp
                  updatedLane.bag_pickup_area.removeById(passenger.id);
                  updatedLane.bag_scanner_off_ramp.removeById(completedBag.id);
                }
              }
            }
            
            // const laneEndTime = performance.now();
            // console.log(`Lane ${lane.name} processed in ${(laneEndTime - laneStartTime).toFixed(2)}ms`);
            return updatedLane;
          });
          // console.timeEnd('processLanes');
          
          // const updateEndTime = performance.now();
          // console.log(`State update took ${(updateEndTime - updateStartTime).toFixed(2)}ms`);
          
          return newState;
        });
        
        // const loopEndTime = performance.now();
        // const totalTime = loopEndTime - loopStartTime;
        // console.log(`Game loop completed in ${totalTime.toFixed(2)}ms (${(totalTime / GAME_TICK_MS * 100).toFixed(1)}% of tick interval)`);
        
        // Warn if we're taking too long
        // if (totalTime > GAME_TICK_MS * 0.8) {
        //   console.warn(`Game loop is taking ${totalTime.toFixed(2)}ms, which is ${(totalTime / GAME_TICK_MS * 100).toFixed(1)}% of the tick interval (${GAME_TICK_MS}ms). This may cause lag.`);
        // }
      }, GAME_TICK_MS);
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
  
  // Update histogram data for the current time interval
  const updateHistogramData = (prevState: GameState): Record<number, number> => {
    const currentInterval = Math.floor(prevState.time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
    const newHistogramData = { ...prevState.histogram_data };
    
    // Ensure all intervals up to the current one exist and are numbers
    for (let t = 0; t <= currentInterval; t += HISTOGRAM_INTERVAL) {
      if (!(t in newHistogramData) || typeof newHistogramData[t] !== 'number') {
        newHistogramData[t] = 0;
      }
    }
    
    return newHistogramData;
  };
  
  // Helper function to safely increment histogram data
  const incrementHistogramData = (state: GameState, time: number) => {
    const timeInterval = Math.floor(time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
    const newHistogramData = updateHistogramData(state);
    newHistogramData[timeInterval] = (newHistogramData[timeInterval] || 0) + 1;
    return newHistogramData;
  };
  
  return (
    <div className="flex flex-col flex-1 min-w-full min-h-0"> {/* min-h-0 is crucial for flex child scrolling */}
      {/* Top Controls Bar */}
      <TopControlBar
        gameState={gameState}
        toggleGame={toggleGame}
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