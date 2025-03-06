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

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Game constants
const INITIAL_SPAWN_RATE = 10; // passengers per minute (changed from 100 to a more reasonable value)
const GAME_TICK_MS = 100; // Update game state every 100ms
const SECURITY_LANE_QUEUE_CAPACITY = 10; // Maximum number of passengers in a security lane queue
const HISTOGRAM_INTERVAL = 30; // Seconds per histogram bar

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
    }
  ];

  // Create initial scanners
  const createScanner = (id: string, name: string, type: 'bag' | 'person'): Scanner => ({
    id,
    name,
    type,
    is_operational: true,
    items_per_minute: type === 'bag' ? 10 : 15, // Bags are slower to scan than people
    current_items: [],
    capacity: type === 'bag' ? 3 : 2, // Bag scanner can handle more items simultaneously
    current_scan_progress: {},
    scan_accuracy: 95,
    last_processed_time: Date.now(),
    waiting_items: [] // Queue for items waiting to be scanned
  });

  // Create initial security lanes
  const securityLanes: SecurityLane[] = [
    {
      id: 'lane_1',
      name: 'Lane 1',
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
      name: 'Lane 2',
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
    score: 0,
    spawn_rate: INITIAL_SPAWN_RATE,
    last_spawn_time: Date.now(),
    paused: true, // Ensure the game starts in a paused state
    histogram_data: {} // Initialize empty histogram data
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(initializeGameState());
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [spawnRateInput, setSpawnRateInput] = useState<string>(INITIAL_SPAWN_RATE.toString());
  
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
          const unloadingSpeed = 5 + (passenger.security_familiarity * 2); // 5-25% per second
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
                const timeInterval = Math.floor(newState.time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
                newState.histogram_data[timeInterval] = (newState.histogram_data[timeInterval] || 0) + 1;
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
              }
            } else {
              // Update scan progress
              updatedLane.person_scanner.current_scan_progress[passenger.id] += 
                (updatedLane.person_scanner.items_per_minute / 60) * (GAME_TICK_MS / 1000) * 100;
              
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
                    
                    // Update histogram data
                    const timeInterval = Math.floor(newState.time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
                    newState.histogram_data[timeInterval] = (newState.histogram_data[timeInterval] || 0) + 1;
                    
                    // Remove passenger from waiting for bags
                    updatedLane.passengers_waiting_for_bags.splice(passengerWaitingIndex, 1);
                    
                    // Decrement processing count
                    updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
                    
                    // Update score
                    newState.score += 10;
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
          
          // Update histogram data
          const timeInterval = Math.floor(newState.time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
          newState.histogram_data[timeInterval] = (newState.histogram_data[timeInterval] || 0) + 1;
          
          // Remove from waiting for bags
          updatedLane.passengers_waiting_for_bags = updatedLane.passengers_waiting_for_bags.filter(p => p.id !== passenger.id);
          
          // Decrement processing count
          updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
          
          // Update score
          newState.score += 5;
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
              
              // Update histogram data
              const timeInterval = Math.floor(newState.time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
              newState.histogram_data[timeInterval] = (newState.histogram_data[timeInterval] || 0) + 1;
              
              // Remove passenger from waiting for bags
              const waitingIndex = updatedLane.passengers_waiting_for_bags.findIndex(
                p => p.id === oldestWaitingPassenger.id
              );
              if (waitingIndex !== -1) {
                updatedLane.passengers_waiting_for_bags.splice(waitingIndex, 1);
              }
              
              // Decrement processing count
              updatedLane.current_processing_count = Math.max(0, updatedLane.current_processing_count - 1);
              
              // Update score (slightly reduced for supervisor intervention)
              newState.score += 7;
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
      // Game is paused, start it
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Apply pixelated rendering for low-res aesthetic
    ctx.imageSmoothingEnabled = false;
    
    // Game variables
    let animationFrameId: number;
    
    // Game loop
    const render = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw a simple shape to show the canvas is working
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Add text
      ctx.fillStyle = '#333';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Airport Security Simulator', canvas.width / 2, canvas.height / 2 - 50);
      ctx.font = '18px Arial';
      ctx.fillText('Game logic is running in the background', canvas.width / 2, canvas.height / 2 + 50);
      ctx.fillText('Use the controls below to manage the game', canvas.width / 2, canvas.height / 2 + 80);
      
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
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get a limited number of passengers from the main queue to display
  const getDisplayPassengers = () => {
    return gameState.main_queue.getAll().slice(0, 5); // Only show up to 5 passengers
  };
  
  // Debug a passenger's journey
  const debugPassengerJourney = (passenger: Passenger) => {
    // Format timestamps for display
    const formatTimestamp = (timestamp?: number) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleTimeString();
    };
    
    // Calculate duration between two timestamps
    const calculateDuration = (start?: number, end?: number) => {
      if (!start || !end) return 'N/A';
      const durationMs = end - start;
      return `${(durationMs / 1000).toFixed(1)}s`;
    };
    
    // Create a formatted journey log
    const journeyLog = [
      `Passenger: ${passenger.name} (${passenger.nationality})`,
      `Spawned: ${formatTimestamp(passenger.spawned_timestamp)}`,
      `Assigned to lane: ${formatTimestamp(passenger.security_lane_queue_assigned_timestamp)}`,
      `Wait time in main queue: ${calculateDuration(passenger.spawned_timestamp, passenger.security_lane_queue_assigned_timestamp)}`,
      passenger.has_bag ? [
        `Bag unload started: ${formatTimestamp(passenger.bag_unload_started_timestamp)}`,
        `Bag unload completed: ${formatTimestamp(passenger.bag_unload_completed_timestamp)}`,
        `Bag unload duration: ${calculateDuration(passenger.bag_unload_started_timestamp, passenger.bag_unload_completed_timestamp)}`,
        `Bag scanner started: ${formatTimestamp(passenger.bag_scanner_started_timestamp)}`,
        `Bag scanner completed: ${formatTimestamp(passenger.bag_scanner_complete_timestamp)}`,
        `Bag scan duration: ${calculateDuration(passenger.bag_scanner_started_timestamp, passenger.bag_scanner_complete_timestamp)}`
      ].join('\n') : 'No bag',
      `Body scanner queue joined: ${formatTimestamp(passenger.body_scanner_queue_joined_timestamp)}`,
      `Body scanner started: ${formatTimestamp(passenger.body_scanner_started_timestamp)}`,
      `Body scanner finished: ${formatTimestamp(passenger.body_scanner_finished_timestamp)}`,
      `Body scan duration: ${calculateDuration(passenger.body_scanner_started_timestamp, passenger.body_scanner_finished_timestamp)}`,
      `Waiting for bag started: ${formatTimestamp(passenger.waiting_for_bag_started_timestamp)}`,
      `Waiting for bag finished: ${formatTimestamp(passenger.waiting_for_bag_finished_timestamp)}`,
      `Waiting for bag duration: ${calculateDuration(passenger.waiting_for_bag_started_timestamp, passenger.waiting_for_bag_finished_timestamp)}`,
      `Security cleared: ${formatTimestamp(passenger.security_cleared_timestamp)}`,
      `Total security process time: ${calculateDuration(passenger.security_lane_queue_assigned_timestamp, passenger.security_cleared_timestamp)}`
    ].join('\n');
    
    console.log(journeyLog);
    alert(journeyLog);
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
  
  // Debug function to log main queue state to console
  const debugMainQueue = () => {
    console.log('Main Queue Debug:');
    console.log('Queue Length:', gameState.main_queue.length);
    console.log('Queue Contents:', gameState.main_queue.getAll().map(p => ({
      id: p.id,
      name: p.name,
      has_bag: p.has_bag
    })));
    console.log('Passengers Array Length:', gameState.passengers.length);
    console.log('Bags Array Length:', gameState.bags.length);
    
    // Check for duplicate passengers in the queue
    const passengers = gameState.main_queue.getAll();
    const passengerIds = passengers.map(p => p.id);
    const uniqueIds = new Set(passengerIds);
    if (passengerIds.length !== uniqueIds.size) {
      console.warn('DUPLICATE PASSENGERS DETECTED IN MAIN QUEUE!');
      
      // Find the duplicates
      const counts: Record<string, number> = {};
      passengerIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      
      // Log the duplicates
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .forEach(([id, count]) => {
          console.warn(`Passenger ID ${id} appears ${count} times in the queue`);
        });
    }
  };
  
  // Clear histogram data
  const clearHistogram = () => {
    setGameState(prevState => ({
      ...prevState,
      histogram_data: {}
    }));
  };
  
  // Helper function to render the histogram
  const renderHistogram = () => {
    // Get the histogram data from the game state
    const { histogram_data } = gameState;
    
    // Convert the histogram data to an array of [time, count] pairs and sort by time
    const histogramEntries = Object.entries(histogram_data)
      .map(([time, count]) => [parseInt(time), count])
      .sort((a, b) => (b[0] as number) - (a[0] as number)); // Sort in descending order (newest first)
    
    // If there's no data, show a message
    if (histogramEntries.length === 0) {
      return (
        <div className="text-gray-400 text-center py-4">
          No passenger data available yet. Process passengers to see the histogram.
        </div>
      );
    }
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...histogramEntries.map(entry => entry[1] as number));
    
    // Calculate the bar height based on the maximum count
    const getBarHeight = (count: number) => {
      return Math.max(10, (count / maxCount) * 150); // Min height of 10px, max height of 150px
    };
    
    return (
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-gray-500">Passengers Processed</div>
          <div className="text-xs text-gray-500">Max: {maxCount} passengers / {HISTOGRAM_INTERVAL}s</div>
        </div>
        <div className="flex items-end h-[180px] border-b border-l border-gray-300 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between">
            <span className="text-xs text-gray-500 -translate-x-2 -translate-y-2">{maxCount}</span>
            <span className="text-xs text-gray-500 -translate-x-2 translate-y-2">0</span>
          </div>
          
          {/* Bars */}
          <div className="flex items-end pl-8 w-full h-full gap-1 overflow-x-auto pb-6">
            {histogramEntries.map(([time, count], index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-12 bg-blue-500 rounded-t"
                  style={{ height: `${getBarHeight(count as number)}px` }}
                >
                  <div className="text-white text-xs text-center font-bold">
                    {count}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                  {formatTime(time as number)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center">
      {/* Hide the canvas by adding a display: none style */}
      <div className="pixelated" style={{ display: 'none' }}>
        <canvas
          ref={canvasRef}
          className="border border-gray-800 shadow-lg"
          style={{ 
            imageRendering: 'pixelated',
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`
          }}
        />
      </div>
      
      {/* Game Controls */}
      <div className="mt-4 p-4 border border-gray-300 rounded-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Game Controls</h2>
          <div className="flex items-center">
            <span className="mr-2">Status:</span>
            <span className={`px-2 py-1 rounded text-white ${gameState.paused ? 'bg-red-500' : 'bg-green-500'}`}>
              {gameState.paused ? 'Paused' : 'Running'}
            </span>
          </div>
        </div>
        <div className="flex space-x-2 mb-4 items-center">
          <Button 
            onClick={toggleGame}
            className={`w-24 ${gameState.paused ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}`}
          >
            {gameState.paused ? "Start" : "Pause"}
          </Button>
          <Button 
            variant="destructive"
            className="w-24"
            onClick={resetGame}
          >
            Reset
          </Button>
          <Button 
            variant="secondary"
            className="w-36"
            onClick={spawnPassenger}
          >
            Spawn Passenger
          </Button>
          <div className="flex items-center ml-4">
            <span className="mr-2 whitespace-nowrap">Spawn Rate:</span>
            <Input 
              type="number" 
              min="0.1" 
              max="100" 
              step="0.1"
              value={spawnRateInput}
              onChange={(e) => setSpawnRateInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateSpawnRate()}
              className="w-16 h-9"
            />
            <span className="mx-2 whitespace-nowrap">per min</span>
            <Button 
              variant="outline"
              onClick={updateSpawnRate}
              size="sm"
              className="w-20"
            >
              Update
            </Button>
            <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
              (Current: {gameState.spawn_rate.toFixed(1)}/min)
            </span>
          </div>
        </div>
        
        {/* Game Stats */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="font-bold">Game Stats</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>Time: {formatTime(gameState.time)}</div>
            <div>Score: {gameState.score}</div>
            <div>Spawn Rate: {gameState.spawn_rate}/min</div>
          </div>
        </div>
        
        {/* Main Queue */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Main Queue ({gameState.main_queue.length} passengers)</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={debugMainQueue}
              className="h-7 px-2 py-1 text-xs bg-gray-100 w-16"
            >
              Debug
            </Button>
          </div>
          
          {/* Queue Capacity Progress Bar */}
          <div className="mt-2 mb-3">
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
          
          <div className="flex flex-wrap gap-2 mt-2">
            {getDisplayPassengers().map((passenger, index) => (
              <div key={`${passenger.id}-${index}`} className="p-2 bg-white rounded border border-gray-300 text-sm w-48">
                <div className="flex items-center justify-between">
                  <span className="truncate">{passenger.name} ({passenger.nationality})</span>
                  <span className="ml-1">{passenger.has_bag ? '🧳' : '🚶'}</span>
                </div>
                <div className="mt-1">
                  <div className="text-xs font-semibold mb-1">Assign to lane:</div>
                  <div className="flex flex-wrap gap-1">
                    {gameState.security_lanes.map(lane => (
                      <Button 
                        key={lane.id}
                        variant="outline"
                        size="sm"
                        onClick={() => assignPassengerToLane(passenger.id, lane.id)}
                        className="h-7 px-2 py-1 text-xs w-16"
                      >
                        {lane.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {gameState.main_queue.length > 5 && (
              <div className="p-2 bg-gray-200 rounded text-sm">
                +{gameState.main_queue.length - 5} more passengers
              </div>
            )}
          </div>
        </div>
        
        {/* Security Lanes */}
        <div className="p-3 bg-gray-100 rounded">
          <h3 className="font-bold">Security Lanes</h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {gameState.security_lanes.map((lane, laneIndex) => (
              <div key={`${lane.id}-${laneIndex}`} className="p-3 bg-white border rounded">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">{lane.name} ({lane.is_open ? 'Open' : 'Closed'})</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => debugLane(lane)}
                    className="h-7 px-2 py-1 text-xs bg-gray-100 w-16"
                  >
                    Debug
                  </Button>
                </div>
                
                {/* QUEUE SECTION */}
                <div className="mt-3 border-t pt-2">
                  <h5 className="font-semibold text-sm">SECURITY LANE QUEUE</h5>
                  <div className="bg-gray-50 p-2 rounded min-h-[80px]">
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
                    
                    {lane.passenger_queue.length > 0 ? (
                      <div className="bg-gray-100 p-1 rounded">
                        {lane.passenger_queue.getAll().slice(0, 3).map((passenger, idx) => (
                          <div key={`${passenger.id}-${idx}`} className="text-xs flex items-center justify-between">
                            <span className="truncate">{passenger.name}</span>
                            <span className="ml-1">{passenger.has_bag ? '🧳' : '🚶'}</span>
                          </div>
                        ))}
                        {lane.passenger_queue.length > 3 && (
                          <div className="text-xs text-gray-500 italic">
                            +{lane.passenger_queue.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">Queue empty</div>
                    )}
                  </div>
                </div>
                
                {/* SCANNER QUEUES - SIDE BY SIDE */}
                <div className="mt-3 border-t pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* BAG SCANNER QUEUE SECTION */}
                    <div>
                      <h5 className="font-semibold text-sm">BAG SCANNER QUEUE</h5>
                      <div className="bg-gray-50 p-2 rounded min-h-[120px]">
                        <div className="text-xs mb-1">Length: {lane.bag_scanner_queue.length} passengers</div>
                        
                        {lane.bag_scanner_queue.length > 0 ? (
                          <div className="bg-gray-100 p-1 rounded">
                            {lane.bag_scanner_queue.slice(0, 3).map((passenger, idx) => (
                              <div key={`${passenger.id}-${idx}`} className="text-xs flex items-center justify-between mb-1">
                                <span className="truncate">{passenger.name}</span>
                                <div className="flex items-center">
                                  <span className="mr-1">🧳</span>
                                  {passenger.unloading_bag && (
                                    <div className="flex items-center">
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
                            ))}
                            {lane.bag_scanner_queue.length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{lane.bag_scanner_queue.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs italic">Queue empty</div>
                        )}
                      </div>
                    </div>
                    
                    {/* BODY SCANNER QUEUE SECTION */}
                    <div>
                      <h5 className="font-semibold text-sm">BODY SCANNER QUEUE</h5>
                      <div className="bg-gray-50 p-2 rounded min-h-[120px]">
                        <div className="text-xs mb-1">Length: {lane.passengers_in_body_scanner_queue.length} passengers</div>
                        
                        {lane.passengers_in_body_scanner_queue.length > 0 ? (
                          <div className="bg-gray-100 p-1 rounded">
                            {lane.passengers_in_body_scanner_queue.slice(0, 3).map((passenger, idx) => (
                              <div key={`${passenger.id}-${idx}`} className="text-xs flex items-center justify-between mb-1">
                                <span className="truncate">{passenger.name}</span>
                                <span>{passenger.has_bag ? '🧳' : '🚶'}</span>
                              </div>
                            ))}
                            {lane.passengers_in_body_scanner_queue.length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{lane.passengers_in_body_scanner_queue.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs italic">Queue empty</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* SCANNERS - SIDE BY SIDE */}
                <div className="mt-3 border-t pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* BAG SCANNER SECTION */}
                    <div>
                      <h5 className="font-semibold text-sm">BAG SCANNER</h5>
                      <div className="bg-gray-50 p-2 rounded min-h-[120px]">
                        <div className="text-xs mb-1">Queue: {lane.bag_scanner.waiting_items.length} bags waiting</div>
                        <div className="text-xs mb-1">Scanner: {lane.bag_scanner.current_items.length}/{lane.bag_scanner.capacity} slots</div>
                        
                        {lane.bag_scanner.current_items.length > 0 ? (
                          <div className="bg-gray-100 p-1 rounded">
                            {lane.bag_scanner.current_items.map(bagId => {
                              const bag = gameState.bags.find(b => b.id === bagId);
                              return bag ? (
                                <div key={bagId} className="text-xs flex justify-between items-center mb-1">
                                  <span className="truncate w-24">{bag.passenger_name}&apos;s bag</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full" 
                                      style={{width: `${Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%`}}
                                    ></div>
                                  </div>
                                  <span className="w-8 text-right">{Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs italic">No bags in scanner</div>
                        )}
                      </div>
                    </div>
                    
                    {/* BODY SCANNER SECTION */}
                    <div>
                      <h5 className="font-semibold text-sm">BODY SCANNER</h5>
                      <div className="bg-gray-50 p-2 rounded min-h-[120px]">
                        <div className="text-xs mb-1">Scanner: {lane.person_scanner.current_items.length}/{lane.person_scanner.capacity} slots</div>
                        
                        {lane.person_scanner.current_items.length > 0 ? (
                          <div className="bg-gray-100 p-1 rounded">
                            {lane.person_scanner.current_items.map(personId => {
                              const passenger = gameState.passengers.find(p => p.id === personId);
                              return passenger ? (
                                <div key={personId} className="text-xs flex justify-between items-center mb-1">
                                  <span className="truncate w-24">{passenger.name}</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full" 
                                      style={{width: `${Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%`}}
                                    ></div>
                                  </div>
                                  <span className="w-8 text-right">{Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%</span>
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
                
                {/* WAITING FOR BAGS SECTION */}
                <div className="mt-3 border-t pt-2">
                  <h5 className="font-semibold text-sm">WAITING FOR BAGS: {lane.passengers_waiting_for_bags.length}</h5>
                  <div className="bg-gray-50 p-2 rounded min-h-[80px]">
                    {lane.passengers_waiting_for_bags.length > 0 ? (
                      <div>
                        {lane.passengers_waiting_for_bags.map((passenger, idx) => (
                          <div key={`${passenger.id}-waiting-${idx}`} className="text-xs py-1 border-b border-gray-100 last:border-0 flex justify-between items-center">
                            <span>{passenger.name}</span>
                            <div className="flex items-center">
                              <span className="mr-2">{passenger.has_bag ? '🧳' : '🚶'}</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => debugPassengerJourney(passenger)}
                                className="h-6 px-2 py-0 text-xs bg-gray-100"
                              >
                                Journey
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">No passengers waiting</div>
                    )}
                  </div>
                </div>
                
                {/* COMPLETED SECTION */}
                <div className="mt-3 border-t pt-2">
                  <h5 className="font-semibold text-sm">COMPLETED: {lane.passengers_completed.length}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Completed Passengers */}
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h3 className="font-bold">Completed Passengers ({gameState.completed.length})</h3>
          <div className="text-sm mt-1 max-h-32 overflow-y-auto">
            {gameState.completed.slice(-5).map((passenger, idx) => (
              <div key={`${passenger.id}-completed-${idx}`} className="text-xs flex justify-between items-center py-1">
                <span>{passenger.name} ({passenger.nationality}) - {passenger.has_bag ? 'With bag' : 'No bag'}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => debugPassengerJourney(passenger)}
                  className="h-6 px-2 py-0 text-xs bg-gray-100"
                >
                  Journey
                </Button>
              </div>
            ))}
            {gameState.completed.length > 5 && <div className="text-xs text-gray-500">...and {gameState.completed.length - 5} more</div>}
          </div>
        </div>
        
        {/* Histogram */}
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Passenger Processing Histogram</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearHistogram}
              className="h-7 px-2 py-1 text-xs bg-gray-100"
            >
              Clear Histogram
            </Button>
          </div>
          {renderHistogram()}
        </div>
      </div>
    </div>
  );
};

export default Game; 