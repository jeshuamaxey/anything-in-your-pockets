'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  GameState, 
  Bag,
  Passenger,
} from '@/types/gameTypes';
import { GAME_TICK_MS, HISTOGRAM_INTERVAL, UNLOADING_ASSISTANCE_THRESHOLD } from '@/lib/game-constants';
import TopControlBar from './game/layout/TopControlBar';
import useGameState from '@/hooks/useGameState';
import { generateRandomBag } from '@/lib/game-generators';
import { generateRandomPassenger } from '@/lib/game-generators';
import SecurityQueue from './game/layout/SecurityQueue';
import { SecurityLanesColumn } from './game/layout/SecurityLanesColumn';
import SystemStatusColumn from './game/layout/SystemStatusColumn';
import { normalDistribution } from '@/lib/game-utils';

const Game = () => {
  const [gameState, setGameState] = useGameState()
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  
  // Ensure the game is properly initialized
  useEffect(() => {
    // Make sure the game is paused on initial load
    if (!gameState.paused) {
      setGameState(prevState => ({
        ...prevState,
        paused: true
      }));
    }
  }, []);

  // Helper function to create and add a passenger to the game state
  const createAndAddPassenger = () => {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);
    const passengerId = `passenger_${timestamp}_${randomId}`;
    console.log(`Creating passenger with ID: ${passengerId}`);
    const newPassenger = generateRandomPassenger(passengerId);
    
    // Set the spawned timestamp
    newPassenger.spawned_timestamp = timestamp;
    
    // Create a bag for the passenger if they have one
    let newBag: Bag | null = null;
    if (newPassenger.has_bag) {
      newBag = generateRandomBag(passengerId, newPassenger.name);
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
      console.log(`Enqueueing passenger ${passengerId} to main queue`);
      newState.main_queue.enqueue(newPassenger);
      
      // Add bag to the bags list if the passenger has one
      if (newBag) {
        newState.bags = [...newState.bags, newBag];
      }
      
      // Update last spawn time
      newState.last_spawn_time = timestamp;
      
      return newState;
    });
  };
  
  // Process security lanes
  const processSecurityLanes = () => {
    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Process each security lane
      newState.security_lanes = newState.security_lanes.map(lane => {
        const updatedLane = { ...lane };
        
        // 1. Process main queue - move passengers to either bag scanner queue or body scanner queue
        if (updatedLane.passenger_queue.length > 0 && updatedLane.current_processing_count < updatedLane.processing_capacity) {
          // Get the next passenger from the queue
          const passenger = updatedLane.passenger_queue.peek();
          
          if (passenger) {
            // Dequeue the passenger from the main queue
            updatedLane.passenger_queue.dequeue();
            updatedLane.current_processing_count++;
            
            // If passenger has a bag, add to bag scanner queue
            if (passenger.has_bag) {
              // Verify the passenger has a bag in the bags array
              const hasBag = newState.bags.some(bag => bag.passenger_id === passenger.id);
              
              if (hasBag) {
                updatedLane.bag_scanner_queue.push(passenger);
              } else {
                // If no bag found, treat as if they don't have a bag
                console.warn(`Passenger ${passenger.id} has has_bag=true but no bag found in bags array`);
                passenger.has_bag = false;
                updatedLane.passengers_in_body_scanner_queue.push(passenger);
              }
            } else {
              // If passenger doesn't have a bag, add directly to body scanner queue
              updatedLane.passengers_in_body_scanner_queue.push(passenger);
            }
          }
        }
        
        // 2. Process bag unloading for passengers in the bag scanner queue
        const baggagePassengers = updatedLane.bag_scanner_queue;
        
        // Check the first N passengers in the bag scanner queue (where N is bag_unloading_bays)
        // and allow them to start unloading their bags
        for (let i = 0; i < Math.min(updatedLane.bag_unloading_bays, baggagePassengers.length); i++) {
          const passenger = baggagePassengers[i];
          
          // Skip passengers who don't have bags
          if (!passenger.has_bag) {
            // This shouldn't happen, but if it does, move them to body scanner queue
            console.warn(`Passenger ${passenger.id} in bag scanner queue but has_bag=false`);
            updatedLane.bag_scanner_queue = updatedLane.bag_scanner_queue.filter(p => p.id !== passenger.id);
            updatedLane.passengers_in_body_scanner_queue.push(passenger);
            continue;
          }
          
          // Find the passenger's bag
          const passengerBag = newState.bags.find(bag => bag.passenger_id === passenger.id);
          
          // If bag not found or already unloaded, move passenger to body scanner queue
          if (!passengerBag) {
            console.warn(`Passenger ${passenger.id} has_bag=true but no bag found`);
            updatedLane.bag_scanner_queue = updatedLane.bag_scanner_queue.filter(p => p.id !== passenger.id);
            updatedLane.passengers_in_body_scanner_queue.push(passenger);
            continue;
          }
          
          if (passengerBag.is_unloaded) {
            // Bag already unloaded, move passenger to body scanner queue
            updatedLane.bag_scanner_queue = updatedLane.bag_scanner_queue.filter(p => p.id !== passenger.id);
            updatedLane.passengers_in_body_scanner_queue.push(passenger);
            continue;
          }
          
          // If passenger isn't already unloading, start the unloading process
          if (!passenger.unloading_bag) {
            passenger.unloading_bag = true;
            passenger.unloading_progress = 0;
            passenger.unloading_start_time = newState.time;
            passenger.bag_unload_started_timestamp = Date.now();
            
            // Add to the unloading passengers list if not already there
            if (!updatedLane.passengers_unloading_bags.some(p => p.id === passenger.id)) {
              updatedLane.passengers_unloading_bags.push(passenger);
            }
          }
          
          // Update unloading progress based on passenger's security_familiarity
          // More experienced passengers (higher familiarity) unload faster
          const unloadingSpeed = 7 + (passenger.security_familiarity * 2.5); // 7-32% per second (increased from 5-25%)
          passenger.unloading_progress = (passenger.unloading_progress || 0) + (unloadingSpeed / 10) * (GAME_TICK_MS / 1000);
          
          // Check if unloading is complete
          if (passenger.unloading_progress >= 100) {
            // Mark bag as unloaded
            const bagIndex = newState.bags.findIndex(bag => bag.passenger_id === passenger.id);
            if (bagIndex !== -1) {
              newState.bags[bagIndex].is_unloaded = true;
              
              // Add bag to scanner waiting queue
              if (!updatedLane.bag_scanner.waiting_items.includes(newState.bags[bagIndex].id)) {
                updatedLane.bag_scanner.waiting_items.push(newState.bags[bagIndex].id);
              }
            }
            
            // Record bag unload completion timestamp
            passenger.bag_unload_completed_timestamp = Date.now();
            
            // Reset unloading state
            passenger.unloading_bag = false;
            passenger.unloading_progress = 0;
            
            // Remove from unloading passengers list
            updatedLane.passengers_unloading_bags = updatedLane.passengers_unloading_bags.filter(
              p => p.id !== passenger.id
            );
            
            // Remove from bag scanner queue
            updatedLane.bag_scanner_queue = updatedLane.bag_scanner_queue.filter(
              p => p.id !== passenger.id
            );
            
            // Add to body scanner queue and record timestamp
            passenger.body_scanner_queue_joined_timestamp = Date.now();
            updatedLane.passengers_in_body_scanner_queue.push(passenger);
          }
        }
        
        // 2.5 Anti-deadlock: Security agent assistance for passengers struggling with unloading
        updatedLane.passengers_unloading_bags.forEach(passenger => {
          if (passenger.unloading_start_time && 
              newState.time - passenger.unloading_start_time > UNLOADING_ASSISTANCE_THRESHOLD) {
            
            // Find an available security agent to help
            const availableAgent = updatedLane.security_agents.find(agent => agent.is_available);
            
            if (availableAgent && Math.random() < 0.2) { // 20% chance per tick for agent to help
              console.log(`Security agent ${availableAgent.name} is assisting passenger ${passenger.name} with unloading`);
              
              // Agent helps speed up unloading significantly
              passenger.unloading_progress = Math.min(100, (passenger.unloading_progress || 0) + 30);
              
              // If unloading is now complete
              if (passenger.unloading_progress >= 100) {
                // Mark bag as unloaded
                const bagIndex = newState.bags.findIndex(bag => bag.passenger_id === passenger.id);
                if (bagIndex !== -1) {
                  newState.bags[bagIndex].is_unloaded = true;
                  
                  // Add bag to scanner waiting queue
                  if (!updatedLane.bag_scanner.waiting_items.includes(newState.bags[bagIndex].id)) {
                    updatedLane.bag_scanner.waiting_items.push(newState.bags[bagIndex].id);
                  }
                }
                
                // Reset unloading state
                passenger.unloading_bag = false;
                passenger.unloading_progress = 0;
                
                // Remove from unloading passengers list
                updatedLane.passengers_unloading_bags = updatedLane.passengers_unloading_bags.filter(
                  p => p.id !== passenger.id
                );
                
                // Remove from bag scanner queue
                updatedLane.bag_scanner_queue = updatedLane.bag_scanner_queue.filter(
                  p => p.id !== passenger.id
                );
                
                // Add to body scanner queue
                updatedLane.passengers_in_body_scanner_queue.push(passenger);
                
                // Update histogram data
                newState.histogram_data = incrementHistogramData(newState, newState.time);
              }
            }
          }
        });
        
        // Clean up unloading passengers list (remove any that are no longer unloading)
        updatedLane.passengers_unloading_bags = updatedLane.passengers_unloading_bags.filter(
          p => p.unloading_bag
        );
        
        // 3. Process body scanner
        if (updatedLane.person_scanner.is_operational) {
          // Process passengers in the body scanner
          for (let i = 0; i < updatedLane.passengers_in_body_scanner_queue.length; i++) {
            const passenger = updatedLane.passengers_in_body_scanner_queue[i];
            
            // Check if passenger is already being scanned
            if (!updatedLane.person_scanner.current_items.includes(passenger.id)) {
              // Add passenger to scanner if there's capacity
              if (updatedLane.person_scanner.current_items.length < updatedLane.person_scanner.capacity) {
                updatedLane.person_scanner.current_items.push(passenger.id);
                updatedLane.person_scanner.current_scan_progress[passenger.id] = 0;
                
                // Record body scanner start timestamp
                passenger.body_scanner_started_timestamp = Date.now();
                
                // Calculate scan time using normal distribution (mean: 3s, stdDev: 1s)
                // Store the total scan time needed for this passenger in seconds
                const scanTimeSeconds = Math.max(0.5, normalDistribution(3, 1)); // Minimum 0.5 seconds
                updatedLane.person_scanner.current_scan_time_needed = updatedLane.person_scanner.current_scan_time_needed || {};
                updatedLane.person_scanner.current_scan_time_needed[passenger.id] = scanTimeSeconds;
              }
            } else {
              // Update scan progress based on the predetermined scan time for this passenger
              const scanTimeNeeded = updatedLane.person_scanner.current_scan_time_needed?.[passenger.id] || 3; // Default to 3s if not set
              const progressIncrement = (GAME_TICK_MS / 1000) * (100 / scanTimeNeeded);
              
              updatedLane.person_scanner.current_scan_progress[passenger.id] += progressIncrement;
              
              // Check if scan is complete
              if (updatedLane.person_scanner.current_scan_progress[passenger.id] >= 100) {
                // Record body scanner finish timestamp
                passenger.body_scanner_finished_timestamp = Date.now();
                
                // Remove passenger from scanner
                updatedLane.person_scanner.current_items = updatedLane.person_scanner.current_items.filter(id => id !== passenger.id);
                delete updatedLane.person_scanner.current_scan_progress[passenger.id];
                
                // Move passenger to waiting for bags
                passenger.waiting_for_bag_started_timestamp = Date.now();
                updatedLane.passengers_waiting_for_bags.push(passenger);
                
                // Remove passenger from body scanner queue
                updatedLane.passengers_in_body_scanner_queue = updatedLane.passengers_in_body_scanner_queue.filter(p => p.id !== passenger.id);
              }
            }
          }
        }
        
        // 4. Process bag scanner
        if (updatedLane.bag_scanner.is_operational) {
          // Move bags from waiting queue to scanner if there's capacity
          while (updatedLane.bag_scanner.current_items.length < updatedLane.bag_scanner.capacity && 
                 updatedLane.bag_scanner.waiting_items.length > 0) {
            const nextBagId = updatedLane.bag_scanner.waiting_items[0];
            const bagIndex = newState.bags.findIndex(b => b.id === nextBagId);
            
            if (bagIndex !== -1 && !newState.bags[bagIndex].is_being_scanned && !newState.bags[bagIndex].scan_complete) {
              // Remove from waiting queue
              updatedLane.bag_scanner.waiting_items.shift();
              
              // Add to scanner
              updatedLane.bag_scanner.current_items.push(nextBagId);
              updatedLane.bag_scanner.current_scan_progress[nextBagId] = 0;
              
              // Mark bag as being scanned
              newState.bags[bagIndex].is_being_scanned = true;
              
              // Find the passenger in the game state and record bag scanner started timestamp
              const passengerId = newState.bags[bagIndex].passenger_id;
              const passengerIndex = newState.passengers.findIndex(p => p.id === passengerId);
              if (passengerIndex !== -1) {
                // Only set the timestamp if it hasn't been set yet (for the first bag)
                if (!newState.passengers[passengerIndex].bag_scanner_started_timestamp) {
                  newState.passengers[passengerIndex].bag_scanner_started_timestamp = Date.now();
                }
              }
            } else {
              // If bag is already being scanned or complete, just remove it from waiting queue
              updatedLane.bag_scanner.waiting_items.shift();
            }
          }
          
          // Process bags in scanner
          for (const bagId of [...updatedLane.bag_scanner.current_items]) {
            // Update scan progress
            updatedLane.bag_scanner.current_scan_progress[bagId] += 
              (updatedLane.bag_scanner.items_per_minute / 60) * (GAME_TICK_MS / 1000) * 100;
            
            // Check if scan is complete
            if (updatedLane.bag_scanner.current_scan_progress[bagId] >= 100) {
              // Remove bag from scanner
              updatedLane.bag_scanner.current_items = updatedLane.bag_scanner.current_items.filter(id => id !== bagId);
              delete updatedLane.bag_scanner.current_scan_progress[bagId];
              
              // Update bag status
              const bagIndex = newState.bags.findIndex(b => b.id === bagId);
              if (bagIndex !== -1) {
                newState.bags[bagIndex].is_being_scanned = false;
                newState.bags[bagIndex].scan_complete = true;
                
                // Check if bag should be flagged for inspection (20% chance)
                if (Math.random() < 0.2) {
                  newState.bags[bagIndex].is_flagged = true;
                  updatedLane.bag_inspection_queue.enqueue(newState.bags[bagIndex]);
                }
                
                // Check if passenger can now complete security
                const passengerId = newState.bags[bagIndex].passenger_id;
                
                // Find the passenger in the game state
                const passengerIndex = newState.passengers.findIndex(p => p.id === passengerId);
                if (passengerIndex !== -1) {
                  // Record bag scanner complete timestamp
                  newState.passengers[passengerIndex].bag_scanner_complete_timestamp = Date.now();
                }
                
                const passengerWaitingIndex = updatedLane.passengers_waiting_for_bags.findIndex(p => p.id === passengerId);
                
                if (passengerWaitingIndex !== -1) {
                  const passenger = updatedLane.passengers_waiting_for_bags[passengerWaitingIndex];
                  
                  // Check if all bags for this passenger are processed
                  const passengerBags = newState.bags.filter(b => b.passenger_id === passenger.id);
                  const allBagsProcessed = passengerBags.every(b => b.scan_complete);
                  
                  if (allBagsProcessed) {
                    // Record waiting for bag finished timestamp
                    passenger.waiting_for_bag_finished_timestamp = Date.now();
                    
                    // Record security cleared timestamp
                    passenger.security_cleared_timestamp = Date.now();
                    
                    // Move passenger to completed
                    updatedLane.passengers_completed.push(passenger);
                    newState.completed.push(passenger);
                    
                    // Update histogram data for the current interval
                    newState.histogram_data = incrementHistogramData(newState, newState.time);
                    
                    // Remove passenger from waiting for bags
                    updatedLane.passengers_waiting_for_bags.splice(passengerWaitingIndex, 1);
                    
                    // Decrement processing count
                    updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
                  }
                }
              }
            }
          }
        }
        
        // 5. Handle passengers without bags who are waiting
        const passengersWithoutBags = updatedLane.passengers_waiting_for_bags.filter(p => !p.has_bag);
        for (const passenger of passengersWithoutBags) {
          // Passenger doesn't have a bag, move directly to completed
          updatedLane.passengers_completed.push(passenger);
          newState.completed.push(passenger);
          
          // Update histogram data for the current interval
          newState.histogram_data = incrementHistogramData(newState, newState.time);
          
          // Remove from waiting for bags
          updatedLane.passengers_waiting_for_bags = updatedLane.passengers_waiting_for_bags.filter(p => p.id !== passenger.id);
          
          // Decrement processing count
          updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
        }
        
        // 6. Anti-deadlock mechanism: Supervisor intervention
        // If the lane is getting congested (many people waiting for bags), a supervisor may help
        if (updatedLane.passengers_waiting_for_bags.length >= 4) {
          // Find a supervisor agent
          const supervisor = updatedLane.security_agents.find(agent => 
            agent.rank === 'supervisor' || agent.rank === 'snr');
          
          if (supervisor && Math.random() < 0.1) { // 10% chance per tick when congested
            // Supervisor helps one random passenger who's been waiting the longest
            const oldestWaitingPassenger = [...updatedLane.passengers_waiting_for_bags]
              .sort((a, b) => (a.waiting_since || 0) - (b.waiting_since || 0))
              [0];
            
            if (oldestWaitingPassenger) {
              console.log(`Supervisor ${supervisor.name} is helping passenger ${oldestWaitingPassenger.name} find their bags`);
              
              // Find all bags for this passenger
              const passengerBags = newState.bags.filter(b => b.passenger_id === oldestWaitingPassenger.id);
              
              // Supervisor expedites bag processing
              passengerBags.forEach(bag => {
                if (!bag.scan_complete) {
                  const bagIndex = newState.bags.findIndex(b => b.id === bag.id);
                  if (bagIndex !== -1) {
                    // Supervisor finds the bag and completes its processing
                    newState.bags[bagIndex].is_being_scanned = false;
                    newState.bags[bagIndex].scan_complete = true;
                    
                    // Remove from scanner if it's there
                    if (updatedLane.bag_scanner.current_items.includes(bag.id)) {
                      updatedLane.bag_scanner.current_items = updatedLane.bag_scanner.current_items.filter(id => id !== bag.id);
                      delete updatedLane.bag_scanner.current_scan_progress[bag.id];
                    }
                    
                    // Remove from waiting queue if it's there
                    const waitingIndex = updatedLane.bag_scanner.waiting_items.indexOf(bag.id);
                    if (waitingIndex !== -1) {
                      updatedLane.bag_scanner.waiting_items.splice(waitingIndex, 1);
                    }
                  }
                }
              });
              
              // Move passenger to completed
              updatedLane.passengers_completed.push(oldestWaitingPassenger);
              newState.completed.push(oldestWaitingPassenger);
              
              // Update histogram data for the current interval
              newState.histogram_data = incrementHistogramData(newState, newState.time);
              
              // Remove passenger from waiting for bags
              const waitingIndex = updatedLane.passengers_waiting_for_bags.findIndex(
                p => p.id === oldestWaitingPassenger.id
              );
              if (waitingIndex !== -1) {
                updatedLane.passengers_waiting_for_bags.splice(waitingIndex, 1);
              }
              
              // Decrement processing count
              updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
            }
          }
        }
        
        return updatedLane;
      });
      
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
        for(let i = 0; i < 10; i++) {
          createAndAddPassenger();
        }
      }

      setGameState(prevState => ({
        ...prevState,
        paused: false
      }));
      
      // Start the game loop
      gameLoopRef.current = setInterval(() => {
        // Update game time
        setGameState(prevState => {
          const newState = { ...prevState };
          newState.time = prevState.time + (GAME_TICK_MS / 1000);
          
          // Update histogram data to ensure all intervals exist
          newState.histogram_data = updateHistogramData(prevState);
          
          // Check if it's time to spawn a new passenger
          const currentTime = Date.now();
          const timeSinceLastSpawn = currentTime - newState.last_spawn_time;
          const spawnInterval = (60 * 1000) / newState.spawn_rate; // Convert spawn rate to milliseconds
          
          // Only spawn a new passenger if enough time has passed since the last spawn
          if (timeSinceLastSpawn >= spawnInterval) {
            // Update the last spawn time to prevent multiple spawns
            newState.last_spawn_time = currentTime;
            
            // Spawn a new passenger outside of this state update to avoid React state batching issues
            // Use a small timeout to ensure this happens after the state update
            setTimeout(() => createAndAddPassenger(), 10);
          }
          
          // Process security lanes
          processSecurityLanes();
          
          return newState;
        });
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