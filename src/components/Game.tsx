'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  GameState, 
  Bag,
  Passenger,
  SecurityAgent,
  SecurityLane,
  Queue,
  BagQueue,
  Scanner
} from '@/types/gameTypes';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from '@/lib/game-utils';
import { GAME_TICK_MS, HISTOGRAM_INTERVAL, INITIAL_SPAWN_RATE, MAX_QUEUE_DISPLAY_LENGTH, SECURITY_LANE_QUEUE_CAPACITY } from '@/lib/game-constants';
import { Histogram } from '@/components/Histogram';

// Initialize a new game state
const initializeGameState = (): GameState => {
  // Create initial security agents
  const securityAgents: SecurityAgent[] = [
    {
      id: 'agent_1',
      name: 'Agent Smith',
      rank: 'mid',
      sex: 'male',
      is_available: true,
      current_passenger_id: null
    },
    {
      id: 'agent_2',
      name: 'Agent Johnson',
      rank: 'jnr',
      sex: 'male',
      is_available: true,
      current_passenger_id: null
    },
    {
      id: 'agent_3',
      name: 'Agent Garcia',
      rank: 'snr',
      sex: 'female',
      is_available: true,
      current_passenger_id: null
    },
    {
      id: 'agent_4',
      name: 'Agent Chen',
      rank: 'mid',
      sex: 'female',
      is_available: true,
      current_passenger_id: null
    },
    {
      id: 'agent_5',
      name: 'Agent Rodriguez',
      rank: 'jnr',
      sex: 'female',
      is_available: true,
      current_passenger_id: null
    },
    {
      id: 'agent_6',
      name: 'Agent Kim',
      rank: 'mid',
      sex: 'male',
      is_available: true,
      current_passenger_id: null
    }
  ];

  // Create initial scanners
  const createScanner = (id: string, name: string, type: 'bag' | 'person'): Scanner => ({
    id,
    name,
    type,
    is_operational: true,
    items_per_minute: type === 'bag' ? 10 : 0, // Only used for bag scanners now
    current_items: [],
    capacity: type === 'bag' ? 3 : 1, // Bag scanner can handle more items simultaneously
    current_scan_progress: {},
    scan_accuracy: 95,
    last_processed_time: Date.now(),
    waiting_items: [],
    current_scan_time_needed: {},
  });

  // Create initial security lanes
  const securityLanes: SecurityLane[] = [
    {
      id: 'lane_1',
      name: 'LANE 1',
      security_agents: [securityAgents[0], securityAgents[1]],
      passenger_queue: new Queue(),
      bag_scanner: createScanner('bag_scanner_1', 'Bag Scanner 1', 'bag'),
      person_scanner: createScanner('person_scanner_1', 'Person Scanner 1', 'person'),
      bag_inspection_queue: new BagQueue(),
      is_open: true,
      processing_capacity: 5,
      current_processing_count: 0,
      passengers_in_body_scanner_queue: [],
      passengers_waiting_for_bags: [],
      passengers_completed: [],
      bag_unloading_bays: 3, // 3 positions at the front of the queue can unload bags
      passengers_unloading_bags: [],
      bag_scanner_queue: [] // Initialize the bag scanner queue as an empty array
    },
    {
      id: 'lane_2',
      name: 'LANE 2',
      security_agents: [securityAgents[2], securityAgents[3]],
      passenger_queue: new Queue(),
      bag_scanner: createScanner('bag_scanner_2', 'Bag Scanner 2', 'bag'),
      person_scanner: createScanner('person_scanner_2', 'Person Scanner 2', 'person'),
      bag_inspection_queue: new BagQueue(),
      is_open: true,
      processing_capacity: 5,
      current_processing_count: 0,
      passengers_in_body_scanner_queue: [],
      passengers_waiting_for_bags: [],
      passengers_completed: [],
      bag_unloading_bays: 3, // 3 positions at the front of the queue can unload bags
      passengers_unloading_bags: [],
      bag_scanner_queue: [] // Initialize the bag scanner queue as an empty array
    },
    {
      id: 'lane_3',
      name: 'LANE 3',
      security_agents: [securityAgents[4], securityAgents[5]],
      passenger_queue: new Queue(),
      bag_scanner: createScanner('bag_scanner_3', 'Bag Scanner 3', 'bag'),
      person_scanner: createScanner('person_scanner_3', 'Person Scanner 3', 'person'),
      bag_inspection_queue: new BagQueue(),
      is_open: true,
      processing_capacity: 5,
      current_processing_count: 0,
      passengers_in_body_scanner_queue: [],
      passengers_waiting_for_bags: [],
      passengers_completed: [],
      bag_unloading_bays: 3, // 3 positions at the front of the queue can unload bags
      passengers_unloading_bags: [],
      bag_scanner_queue: [] // Initialize the bag scanner queue as an empty array
    }
  ];

  // Create a new game state
  return {
    passengers: [],
    bags: [],
    security_agents: securityAgents,
    security_lanes: securityLanes,
    main_queue: new Queue(),
    completed: [],
    rejected: [],
    time: 0,
    spawn_rate: INITIAL_SPAWN_RATE,
    last_spawn_time: Date.now(),
    paused: true, // Ensure the game starts in a paused state
    histogram_data: { 0: 0 } // Initialize with zero passengers at time 0
  };
};

// Generate a random passenger
const generateRandomPassenger = (id: string): Passenger => {
  const sex = Math.random() > 0.5 ? 'male' : 'female';
  const presentingGender = Math.random() > 0.9 ? 'ambiguous' : sex;
  
  return {
    id,
    name: `Passenger ${id.substring(id.length - 3)}`,
    nationality: getRandomNationality(),
    security_familiarity: Math.floor(Math.random() * 11),
    sex,
    presenting_gender: presentingGender,
    preferred_security_agent_gender: Math.random() > 0.8 
      ? (Math.random() > 0.5 ? 'male' : 'female') 
      : null,
    has_bag: Math.random() > 0.1, // 90% of passengers have bags
    waiting_since: undefined
  };
};

// Generate a random bag for a passenger
const generateRandomBag = (passengerId: string, passengerName: string): Bag => {
  return {
    id: `bag_${passengerId}`, // Use the full passenger ID to ensure uniqueness
    passenger_id: passengerId,
    passenger_name: passengerName,
    has_electronics: Math.random() > 0.3,
    has_suspicious_item: Math.random() > 0.9,
    has_liquids: Math.random() > 0.7,
    is_being_scanned: false,
    is_flagged: false,
    scan_complete: false,
    is_unloaded: false // Bag starts as not unloaded
  };
};

// Get a random nationality
const getRandomNationality = (): string => {
  const nationalities = [
    'American', 'British', 'Canadian', 'German', 'French', 
    'Japanese', 'Chinese', 'Indian', 'Australian', 'Brazilian',
    'Mexican', 'Russian', 'Italian', 'Spanish', 'Dutch'
  ];
  return nationalities[Math.floor(Math.random() * nationalities.length)];
};

const Game = () => {
  const [gameState, setGameState] = useState<GameState>(initializeGameState());
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [spawnRateInput, setSpawnRateInput] = useState<string>(INITIAL_SPAWN_RATE.toString());
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
  
  // Spawn a new passenger
  const spawnPassenger = () => {
  console.log('Spawning passenger');
    // Create a new passenger and add it to the game state
    createAndAddPassenger();
  };

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
  
  // Assign a passenger to a security lane
  const assignPassengerToLane = (passengerId: string, laneId: string) => {
    // Find the passenger in the main queue
    const passenger = gameState.main_queue.findById(passengerId);
    if (!passenger) return;
    
    // Find the security lane
    const lane = gameState.security_lanes.find(lane => lane.id === laneId);
    if (!lane) return;
    
    // Check if the lane queue is at capacity
    if (lane.passenger_queue.length >= SECURITY_LANE_QUEUE_CAPACITY) {
      // Queue is full, don't assign the passenger
      console.log(`Lane ${lane.name} queue is at capacity. Cannot assign more passengers.`);
      return;
    }
    
    // Create a new state to work with
    const newGameState = { ...gameState };
    
    // Find the lane in the new state
    const newLane = newGameState.security_lanes.find(l => l.id === laneId);
    if (!newLane) return;
    
    // Remove the passenger from the main queue
    newGameState.main_queue.removeById(passengerId);
    
    // Set the timestamp for when the passenger was assigned to a security lane
    passenger.security_lane_queue_assigned_timestamp = Date.now();
    
    // Add the passenger to the security lane queue
    newLane.passenger_queue.enqueue(passenger);
    
    // Ensure the queue doesn't exceed capacity
    while (newLane.passenger_queue.length > SECURITY_LANE_QUEUE_CAPACITY) {
      // Remove excess passengers and put them back in the main queue
      const excessPassenger = newLane.passenger_queue.dequeue();
      if (excessPassenger) {
        newGameState.main_queue.enqueue(excessPassenger);
      }
    }
    
    // Update the game state
    setGameState(newGameState);
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
        const UNLOADING_ASSISTANCE_THRESHOLD = 15; // seconds
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
  
  // Update spawn rate
  const updateSpawnRate = () => {
    const rate = parseFloat(spawnRateInput);
    if (!isNaN(rate) && rate > 0) {
      console.log(`Updating spawn rate from ${gameState.spawn_rate} to ${rate} passengers per minute`);
      
      // Update the game state with the new spawn rate
      setGameState(prevState => ({
        ...prevState,
        spawn_rate: rate
      }));
    } else {
      // If input is invalid, reset to current value
      setSpawnRateInput(gameState.spawn_rate.toString());
      console.log("Invalid spawn rate input. Please enter a positive number.");
    }
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
  
  // Reset the game
  const resetGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Initialize a new game state but ensure it's paused
    const newGameState = initializeGameState();
    newGameState.paused = true; // Ensure the game is paused after reset
    
    setGameState(newGameState);
    setSpawnRateInput(INITIAL_SPAWN_RATE.toString());
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);
  
  // Canvas rendering
  useEffect(() => {
    // Game variables
    let animationFrameId: number;
    
    // Game loop
    const render = () => {
      // Continue animation loop
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    // Start the game loop
    render();
    
    // Cleanup function
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  // Get a limited number of passengers from the main queue to display
  const getDisplayPassengers = () => {
    return gameState.main_queue.getAll().slice(0, MAX_QUEUE_DISPLAY_LENGTH); // Only show up to 5 passengers
  };
  
  // Debug a lane
  const debugLane = (lane: SecurityLane) => {
    console.log('Lane:', lane);
    
    // Format the lane data for display
    const laneInfo = `
      Lane: ${lane.name}
      Queue Length: ${lane.passenger_queue.length}
      Bag Scanner Queue: ${lane.bag_scanner_queue.length}
      Body Scanner Queue: ${lane.passengers_in_body_scanner_queue.length}
      Waiting for Bags: ${lane.passengers_waiting_for_bags.length}
      Completed: ${lane.passengers_completed.length}
      Processing: ${lane.current_processing_count}/${lane.processing_capacity}
    `;
    
    alert(laneInfo);
  };
  
  // Calculate duration between two timestamps
  const calculateDuration = (start?: number, end?: number) => {
    if (!start || !end) return 0;
    const durationMs = end - start;
    return durationMs / 1000; // Return duration in seconds
  };
  
  // Format duration for display
  const formatDuration = (durationSeconds: number) => {
    if (durationSeconds === 0) return 'N/A';
    return `${durationSeconds.toFixed(1)}s`;
  };
  
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
  
  // Generate a random number from a normal distribution
  const normalDistribution = (mean: number, stdDev: number): number => {
    // Box-Muller transform to generate normally distributed random numbers
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  };
  
  return (
    <div className="flex flex-col flex-1 min-w-full min-h-0"> {/* min-h-0 is crucial for flex child scrolling */}
      {/* Top Controls Bar */}
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
          
          <div className="flex items-center">
            <span className="mr-2 whitespace-nowrap text-sm">Rate:</span>
            <Input 
              type="number" 
              min="0.1" 
              max="100" 
              step="0.1"
              value={spawnRateInput}
              onChange={(e) => setSpawnRateInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateSpawnRate()}
              className="w-16 h-8"
            />
            <span className="mx-1 whitespace-nowrap text-sm">/min</span>
            <Button 
              variant="outline"
              onClick={updateSpawnRate}
              size="sm"
              className="h-8 px-2"
            >
              Set
            </Button>
          </div>
          
          <Button 
            variant="secondary"
            size="sm"
            onClick={spawnPassenger}
            className="h-8"
          >
            Spawn
          </Button>
          
          <Button 
            variant="destructive"
            size="sm"
            onClick={resetGame}
            className="h-8"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main UI */}
      <div className="flex flex-1 ">
        {/* Left Column - Security Queue */}
        <div className="w-1/5 border-r border-gray-300 flex flex-col min-h-0"> {/* min-h-0 allows flex child to scroll */}
          <div className="p-4 border-b border-gray-300">
            <h2 className="text-xl font-bold mb-3">SECURITY QUEUE</h2>
            
            {/* Queue Capacity Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Queue Capacity: {gameState.main_queue.length}/200</span>
                <span>{Math.round((gameState.main_queue.length / 200) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    (gameState.main_queue.length / 200) * 100 < 50 ? 'bg-green-500' : 
                    (gameState.main_queue.length / 200) * 100 < 70 ? 'bg-yellow-500' : 
                    (gameState.main_queue.length / 200) * 100 < 90 ? 'bg-orange-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((gameState.main_queue.length / 200) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Scrollable Queue List */}
          <div className="flex-1 max-h-[calc(100%-100px)] overflow-y-auto p-2">
            {getDisplayPassengers().map((passenger, index) => (
              <div key={`${passenger.id}-${index}`} className="p-2 bg-white border border-gray-300 text-sm mb-2">
                <PassengerLabel 
                  passenger={passenger} 
                  onClick={setSelectedPassenger}
                  showDetails={true}
                />
                <div className="mt-1">
                  <div className="text-xs font-semibold mb-1">Assign to lane:</div>
                  <div className="flex flex-row flex-wrap gap-1">
                    {gameState.security_lanes.slice(0, 2).map(lane => {
                      const laneIsDisabled = lane.passenger_queue.length >= SECURITY_LANE_QUEUE_CAPACITY;
                      return (
                        <Button 
                          key={lane.id}
                          variant="outline"
                          disabled={laneIsDisabled}
                          size="sm"
                          onClick={() => assignPassengerToLane(passenger.id, lane.id)}
                          className="h-7 px-2 py-1 text-xs"
                        >
                          {laneIsDisabled ? '🔴' : '🟢'} {lane.name}
                        </Button>
                      )})}
                  </div>
                </div>
              </div>
            ))}
          {gameState.main_queue.length > MAX_QUEUE_DISPLAY_LENGTH && (
              <div className="p-2 bg-gray-200 rounded text-sm text-center">
                +{gameState.main_queue.length - MAX_QUEUE_DISPLAY_LENGTH} more passengers
              </div>
            )}
          </div>
        </div>

        {/* Center Column - Security Lanes */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Security Lanes */}
            <div className="flex flex-col">
              {/* Security Lanes */}
              {gameState.security_lanes.slice(0, 2).map((lane, laneIndex) => (
                <div key={`${lane.id}-${laneIndex}`} className="col-span-1 border first:border-t-0 border-l-0 border-b-0 border-gray-300 p-2">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">{lane.name}</h2>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => debugLane(lane)}
                      className="h-7 px-2 py-1 text-xs bg-gray-100"
                    >
                      Debug
                    </Button>
                  </div>
                  
                  {/* Lane layout based on wireframe - 4 column layout */}
                  <div className="grid grid-cols-4 gap-2 min-h-[450px]">
                    {/* Column 1: Lane Queue (full height) */}
                    <div className="col-span-1 border border-gray-200 rounded p-2 h-full">
                      <h3 className="font-semibold text-sm mb-2">Lane queue</h3>
                      <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Length: {lane.passenger_queue.length} passengers</span>
                          <span>{Math.round((lane.passenger_queue.length / SECURITY_LANE_QUEUE_CAPACITY) * 100)}%</span>
                        </div>
                        
                        {/* Queue Capacity Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div 
                            className={`h-1.5 rounded-full ${
                              (lane.passenger_queue.length / SECURITY_LANE_QUEUE_CAPACITY) * 100 < 50 ? 'bg-green-500' : 
                              (lane.passenger_queue.length / SECURITY_LANE_QUEUE_CAPACITY) * 100 < 70 ? 'bg-yellow-500' : 
                              (lane.passenger_queue.length / SECURITY_LANE_QUEUE_CAPACITY) * 100 < 90 ? 'bg-orange-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((lane.passenger_queue.length / SECURITY_LANE_QUEUE_CAPACITY) * 100, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="overflow-y-auto h-[calc(100%-2rem)]">
                          {lane.passenger_queue.length > 0 ? (
                            <div className="bg-gray-100 p-1 rounded">
                              {lane.passenger_queue.getAll().map((passenger, idx) => (
                                <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-0">
                                  <PassengerLabel 
                                    passenger={passenger} 
                                    onClick={setSelectedPassenger}
                                    showDetails={false}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs italic">Queue empty</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Column 2: Scanner Queues */}
                    <div className="col-span-1 flex flex-col space-y-3">
                      {/* Bag Scanner Queue */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">Bag scanner queue</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="text-xs mb-1">Length: {lane.bag_scanner_queue.length} passengers</div>
                          
                          <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                            {lane.bag_scanner_queue.length > 0 ? (
                              <div className="bg-gray-100 p-1 rounded">
                                {lane.bag_scanner_queue.map((passenger, idx) => {
                                  const isUnloading = passenger.unloading_bag;
                                  const isWaiting = idx >= lane.bag_unloading_bays;
                                  return (
                                    <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-b-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                          <PassengerLabel 
                                            passenger={passenger} 
                                            onClick={setSelectedPassenger}
                                            showDetails={false}
                                          />
                                          {!isUnloading && isWaiting && (
                                            <span className="text-gray-400 text-[10px] italic">waiting</span>
                                          )}
                                        </div>
                                        {passenger.unloading_bag && (
                                          <div className="flex items-center ml-2">
                                            <div className="w-10 bg-gray-200 rounded-full h-1.5 mr-1">
                                              <div 
                                                className="bg-blue-500 h-1.5 rounded-full" 
                                                style={{width: `${Math.floor(passenger.unloading_progress || 0)}%`}}
                                              ></div>
                                            </div>
                                            <span className="text-xs">{Math.floor(passenger.unloading_progress || 0)}%</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">Queue empty</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Body Scanner Queue */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">Body scanner queue</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="text-xs mb-1">Length: {lane.passengers_in_body_scanner_queue.length} passengers</div>
                          
                          <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                            {lane.passengers_in_body_scanner_queue.length > 0 ? (
                              <div className="bg-gray-100 p-1 rounded">
                                {lane.passengers_in_body_scanner_queue.map((passenger, idx) => (
                                  <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-b-0">
                                    <PassengerLabel 
                                      passenger={passenger} 
                                      onClick={setSelectedPassenger}
                                      showDetails={false}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">Queue empty</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Column 3: Scanners */}
                    <div className="col-span-1 flex flex-col space-y-3">
                      {/* Bag Scanner */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">Bag scanner</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="text-xs font-semibold mb-1">Scanner: {lane.bag_scanner.current_items.length}/{lane.bag_scanner.capacity}</div>
                          
                          <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                            {lane.bag_scanner.current_items.length > 0 ? (
                              <div className="bg-gray-100 p-1 rounded">
                                {lane.bag_scanner.current_items.map(bagId => {
                                  const bag = gameState.bags.find(b => b.id === bagId);
                                  return bag ? (
                                    <div key={bagId} className="text-xs flex justify-between items-center mb-1 p-1 border-b border-gray-100 last:border-b-0">
                                      <span className="truncate w-16">{bag.passenger_name.split(' ')[0]}</span>
                                      <div className="w-12 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-green-500 h-2 rounded-full" 
                                          style={{width: `${Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%`}}
                                        ></div>
                                      </div>
                                      <span className="w-6 text-right">{Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">No bags in scanner</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Body Scanner */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">Body scanner</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="text-xs font-semibold mb-1">Scanner: {lane.person_scanner.current_items.length}/{lane.person_scanner.capacity}</div>
                          
                          <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                            {lane.person_scanner.current_items.length > 0 ? (
                              <div className="bg-gray-100 p-1 rounded">
                                {lane.person_scanner.current_items.map(personId => {
                                  const passenger = gameState.passengers.find(p => p.id === personId);
                                  return passenger ? (
                                    <div key={personId} className="text-xs flex justify-between items-center mb-1 p-1 border-b border-gray-100 last:border-b-0">
                                      <span className="truncate w-16">{passenger.name.split(' ')[0]}</span>
                                      <div className="w-12 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-green-500 h-2 rounded-full" 
                                          style={{width: `${Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%`}}
                                        ></div>
                                      </div>
                                      <span className="w-6 text-right">{Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">No people in scanner</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Column 4: Placeholder and Waiting for Bags */}
                    <div className="col-span-1 flex flex-col space-y-3">
                      {/* Placeholder */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">PLACEHOLDER</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="text-gray-400 text-xs italic">Future functionality</div>
                        </div>
                      </div>
                      
                      {/* Waiting for Bags */}
                      <div className="border border-gray-200 rounded p-2 flex-1">
                        <h3 className="font-semibold text-sm mb-2">Waiting for bags</h3>
                        <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                          <div className="overflow-y-auto h-full">
                            {lane.passengers_waiting_for_bags.length > 0 ? (
                              <div>
                                {lane.passengers_waiting_for_bags.map((passenger, idx) => (
                                  <div key={`${passenger.id}-waiting-${idx}`} className="text-xs py-1 border-b border-gray-100 last:border-0">
                                    <PassengerLabel 
                                      passenger={passenger} 
                                      onClick={setSelectedPassenger}
                                      showDetails={false}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">No passengers waiting</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - System Status */}
        <div className="w-1/5 border-l border-gray-300 flex flex-col min-h-0 p-4">
          {/* System Status */}
          <h2 className="text-xl font-bold mb-3">SYSTEM STATUS</h2>
          
          {/* Histogram */}
          <div className="mb-4 h-64 border border-gray-200 rounded p-2 bg-white">
            <Histogram {...gameState} />
          </div>
          
          <div className="grid grid-cols-1 gap-2 mb-4">
            <div className="p-2 bg-gray-50 rounded">Completed Passengers: {gameState.completed.length}</div>
          </div>
          
          <div className="text-sm max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
            {gameState.completed.slice(-5).map((passenger, idx) => (
              <div key={`${passenger.id}-completed-${idx}`} className="text-xs flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <PassengerLabel 
                  passenger={passenger} 
                  onClick={setSelectedPassenger}
                  showDetails={true}
                />
              </div>
            ))}
            {gameState.completed.length > 5 && <div className="text-gray-500">...and {gameState.completed.length - 5} more</div>}
          </div>

          {/* Passenger Journey Info (when selected) */}
          {selectedPassenger && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <h3 className="font-bold text-base mb-2">{selectedPassenger.name}&apos;s Journey</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedPassenger(null)}
                  className="h-7 px-2 py-0 text-xs"
                  >
                  &times;
                </Button>
              </div>
              
              {/* Passenger Info */}
              <div className="mb-3">
                <div className="text-xs mb-1"><span className="font-medium">Nationality:</span> {selectedPassenger.nationality}</div>
                <div className="text-xs mb-1"><span className="font-medium">Security Familiarity:</span> {selectedPassenger.security_familiarity}/10</div>
                <div className="text-xs mb-1"><span className="font-medium">Has Bag:</span> {selectedPassenger.has_bag ? 'Yes' : 'No'}</div>
              </div>
              
              {/* Journey Bar Chart */}
              <div className="mb-3">
                <JourneyBarChart passenger={selectedPassenger} />
              </div>
              
              {/* Detailed Timeline */}
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-1 p-1 bg-blue-50 rounded">
                  <div><span className="font-medium">Main Queue Wait:</span></div>
                  <div>{formatDuration(calculateDuration(selectedPassenger.spawned_timestamp, selectedPassenger.security_lane_queue_assigned_timestamp))}</div>
                </div>
                
                {selectedPassenger.has_bag && (
                  <>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-green-50 rounded">
                      <div><span className="font-medium">Bag Unload:</span></div>
                      <div>{formatDuration(calculateDuration(selectedPassenger.bag_unload_started_timestamp, selectedPassenger.bag_unload_completed_timestamp))}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 p-1 bg-yellow-50 rounded">
                      <div><span className="font-medium">Bag Scan:</span></div>
                      <div>{formatDuration(calculateDuration(selectedPassenger.bag_scanner_started_timestamp, selectedPassenger.bag_scanner_complete_timestamp))}</div>
                    </div>
                  </>
                )}
                
                <div className="grid grid-cols-2 gap-1 p-1 bg-purple-50 rounded">
                  <div><span className="font-medium">Body Scanner Queue:</span></div>
                  <div>{formatDuration(calculateDuration(selectedPassenger.body_scanner_queue_joined_timestamp, selectedPassenger.body_scanner_started_timestamp))}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 p-1 bg-red-50 rounded">
                  <div><span className="font-medium">Body Scan:</span></div>
                  <div>{formatDuration(calculateDuration(selectedPassenger.body_scanner_started_timestamp, selectedPassenger.body_scanner_finished_timestamp))}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 p-1 bg-orange-50 rounded">
                  <div><span className="font-medium">Waiting for Bag:</span></div>
                  <div>{formatDuration(calculateDuration(selectedPassenger.waiting_for_bag_started_timestamp, selectedPassenger.waiting_for_bag_finished_timestamp))}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded mt-2">
                  <div><span className="font-medium">Total Time:</span></div>
                  <div>{formatDuration(calculateDuration(selectedPassenger.spawned_timestamp, selectedPassenger.security_cleared_timestamp))}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for the journey stacked bar chart
const JourneyBarChart = ({ passenger }: { passenger: Passenger }) => {
  // Calculate durations for each phase
  const calculatePhaseDuration = (start?: number, end?: number) => {
    if (!start || !end) return 0;
    return (end - start) / 1000; // seconds
  };
  
  // Define the journey phases and their colors
  const phases = [
    { 
      name: 'Queue Wait', 
      duration: calculatePhaseDuration(passenger.spawned_timestamp, passenger.security_lane_queue_assigned_timestamp),
      color: 'bg-blue-300'
    },
    ...(passenger.has_bag ? [
      { 
        name: 'Bag Unload', 
        duration: calculatePhaseDuration(passenger.bag_unload_started_timestamp, passenger.bag_unload_completed_timestamp),
        color: 'bg-green-300'
      },
      { 
        name: 'Bag Scan', 
        duration: calculatePhaseDuration(passenger.bag_scanner_started_timestamp, passenger.bag_scanner_complete_timestamp),
        color: 'bg-yellow-300'
      }
    ] : []),
    { 
      name: 'Body Scan Queue', 
      duration: calculatePhaseDuration(passenger.body_scanner_queue_joined_timestamp, passenger.body_scanner_started_timestamp),
      color: 'bg-purple-300'
    },
    { 
      name: 'Body Scan', 
      duration: calculatePhaseDuration(passenger.body_scanner_started_timestamp, passenger.body_scanner_finished_timestamp),
      color: 'bg-red-300'
    },
    { 
      name: 'Waiting for Bag', 
      duration: calculatePhaseDuration(passenger.waiting_for_bag_started_timestamp, passenger.waiting_for_bag_finished_timestamp),
      color: 'bg-orange-300'
    }
  ].filter(phase => phase.duration > 0);
  
  // Calculate total journey time
  const totalTime = phases.reduce((sum, phase) => sum + phase.duration, 0);
  
  // If no journey data yet
  if (totalTime === 0) {
    return <div className="text-center py-4">No journey data available yet.</div>;
  }
  
  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-medium">Journey Time Breakdown</div>
      
      {/* Stacked bar chart */}
      <div className="h-10 w-full flex rounded-md overflow-hidden">
        {phases.map((phase, index) => {
          const widthPercent = (phase.duration / totalTime) * 100;
          return (
            <div 
              key={index}
              className={`${phase.color} relative group`}
              style={{ width: `${widthPercent}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap">
                {phase.name}: {phase.duration.toFixed(1)}s ({widthPercent.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phases.map((phase, index) => (
          <div key={index} className="flex items-center text-xs">
            <div className={`w-3 h-3 ${phase.color} mr-1 rounded-sm`}></div>
            <span>{phase.name}: {phase.duration.toFixed(1)}s</span>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-sm">Total journey time: {totalTime.toFixed(1)} seconds</div>
    </div>
  );
};

// Helper component for passenger labels
const PassengerLabel = ({ 
  passenger, 
  onClick, 
  showDetails = true 
}: { 
  passenger: Passenger, 
  onClick: (passenger: Passenger) => void,
  showDetails?: boolean 
}) => {
  return (
    <div 
      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded"
      onClick={() => onClick(passenger)}
    >
      <span className="truncate">{passenger.name}{showDetails ? ` (${passenger.nationality})` : ''}</span>
      <span className="ml-1">{passenger.has_bag ? '🧳' : '🚶'}</span>
    </div>
  );
};

export default Game; 