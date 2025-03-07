import { GameState } from "@/types/gameTypes";
import { GAME_TICK_MS, INITIAL_PASSENGERS, LANE_LINE_CAPACITY } from "./game-constants";
import { Dispatch, RefObject, SetStateAction } from "react";
import { generatePassengerId } from "./game-utils";
import { generateRandomPassenger } from "./game-generators";
import { generateRandomBag } from "./game-generators";
import { getTick } from "./game-loop";
import { playAssignSound, startAmbientSound, isAmbientSoundEnabled } from "./audio-utils";

export const startGame = (gameState: GameState, setGameState: Dispatch<SetStateAction<GameState>>, gameLoopRef: RefObject<NodeJS.Timeout | null>) => {
  if(gameState.time === 0) {
    // Spawn initial passengers
    const initialPassengers = Math.min(INITIAL_PASSENGERS, gameState.main_queue.capacity);
    for(let i = 0; i < initialPassengers; i++) {
      createAndAddPassenger(setGameState);
    }
  }

  setGameState(prevState => ({
    ...prevState,
    game_start_time: Date.now(),
    paused: false
  }));
  
  // Start the game loop
  const tick = getTick(gameState, setGameState);
  gameLoopRef.current = setInterval(tick, GAME_TICK_MS);

  if(isAmbientSoundEnabled()) startAmbientSound();
}

// Helper function to create and add a passenger to the game state
export const createAndAddPassenger = (setGameState: Dispatch<SetStateAction<GameState>>) => {
  const timestamp = Date.now();
  const passengerId = generatePassengerId(timestamp)
  const newPassenger = generateRandomPassenger(passengerId);
  
  // Set the spawned timestamp
  newPassenger.spawned_timestamp = timestamp;
  
  // Create a bag for the passenger if they have one
  if (newPassenger.has_bag) {
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

// Assign a passenger to a security lane
export const assignPassengerToLane = (gameState: GameState, setGameState: (gameState: GameState) => void, passengerId: string, laneId: string) => {
  // Find the passenger in the main queue
  const passenger = gameState.main_queue.findById(passengerId);
  if (!passenger) return;
  
  // Find the security lane
  const lane = gameState.security_lanes.find(lane => lane.id === laneId);
  if (!lane) return;
  
  // Check if the lane queue is at capacity
  if (lane.lane_line.length >= LANE_LINE_CAPACITY) {
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
  newLane.lane_line.enqueue(passenger);
  newLane.total_added++;
  
  // Ensure the queue doesn't exceed capacity
  while (newLane.lane_line.length > LANE_LINE_CAPACITY) {
    // Remove excess passengers and put them back in the main queue
    const excessPassenger = newLane.lane_line.dequeue();
    if (excessPassenger) {
      newGameState.main_queue.enqueue(excessPassenger);
      newLane.total_added--;
    }
  }

  playAssignSound();
  
  // Update the game state
  setGameState(newGameState);
};
