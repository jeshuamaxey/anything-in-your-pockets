import { GameState } from "@/types/gameTypes";
import { LANE_LINE_CAPACITY } from "./game-constants";

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
  
  // Ensure the queue doesn't exceed capacity
  while (newLane.lane_line.length > LANE_LINE_CAPACITY) {
    // Remove excess passengers and put them back in the main queue
    const excessPassenger = newLane.lane_line.dequeue();
    if (excessPassenger) {
      newGameState.main_queue.enqueue(excessPassenger);
    }
  }
  
  // Update the game state
  setGameState(newGameState);
};
