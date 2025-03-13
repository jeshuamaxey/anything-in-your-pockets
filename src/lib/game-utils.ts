import { Bag, GameState, Passenger, SecurityLane } from "@/types/gameTypes";
import { HISTOGRAM_INTERVAL } from "./game-constants";

export const debugLog = (laneId: string, message: string, ...args: unknown[]) => {
  return;
  
  if (laneId === 'lane_1') {
    console.log(`[Lane ${laneId}]`, message, ...args);
  }
};

export const generatePassengerId = (currentTime?: number): string => {
  const timestamp = currentTime || Date.now();
  const randomId = Math.floor(Math.random() * 1000000000);
  return `passenger_${timestamp}_${randomId}`;
};

// Format time as MM:SS
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const countPassengersInLane = (lane: SecurityLane): number => {
  return (
    lane.lane_line.length +
    lane.bag_drop_line.length +
    lane.bag_drop_unload.length +
    lane.body_scan_line.length +
    lane.bag_pickup_area.length +
    lane.body_scanner.current_items.length
  );
};

// export const countLaneCapacity = (lane: SecurityLane): number => {
//   return (
//     lane.passenger_queue.capacity +
//     lane.bag_scanner_queue.capacity +
//     lane.passengers_in_body_scanner_queue.capacity +
//     lane.passengers_waiting_for_bags.capacity
//   );
// };

export const getAllBagsInLane = (lane: SecurityLane): Bag[] => {
  // Get bags from passengers in queues
  const lane_line_bags = lane.lane_line.getAll().map(passenger => passenger.bag);
  const bag_drop_line_bags = lane.bag_drop_line.getAll().map(passenger => passenger.bag);
  const bag_drop_unload_bags = lane.bag_drop_unload.getAll().map(passenger => passenger.bag);

  // Get bags directly in scanner queues
  const scanner_bags = [
    ...lane.bag_scanner.waiting_items.getAll(),
    ...lane.bag_scanner.current_items.getAll(),
    ...lane.bag_scanner_off_ramp.getAll(),
  ];

  // Combine and filter out null bags
  return [...lane_line_bags, ...bag_drop_line_bags, ...bag_drop_unload_bags, ...scanner_bags]
    .filter((bag): bag is Bag => bag !== null);
};

export const getAllLanePassengers = (lane: SecurityLane): Passenger[] => {
  const all = [
    ...lane.lane_line.getAll(),
    ...lane.bag_drop_line.getAll(),
    ...lane.bag_drop_unload.getAll(),
    ...lane.body_scan_line.getAll(),
    ...lane.bag_pickup_area.getAll(),
    ...lane.body_scanner.current_items.getAll(),
  ]

  return all.filter(passenger => passenger !== null) as Passenger[];
};

// Calculate duration between two timestamps
export const calculateDuration = (start?: number, end?: number) => {
  if (!start || !end) return 0;
  const durationMs = end - start;
  return durationMs / 1000; // Return duration in seconds
};

// Format duration for display
export const formatDuration = (durationSeconds: number) => {
  if (durationSeconds === 0) return 'N/A';
  const seconds = durationSeconds % 60;
  const minutes = Math.floor(durationSeconds / 60);
  
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toFixed(0).toString().padStart(2, '0');

  if (minutes > 0) {
    return `${mm}:${ss}`;
  }
  return `${ss}s`;
};

// Generate a random number from a normal distribution
export const normalDistribution = (mean: number, stdDev: number): number => {
  // Box-Muller transform to generate normally distributed random numbers
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};

// Update histogram data for the current time interval
export const updateHistogramData = (prevState: GameState): Record<number, number> => {
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
export const incrementHistogramData = (state: GameState, time: number) => {
  const timeInterval = Math.floor(time / HISTOGRAM_INTERVAL) * HISTOGRAM_INTERVAL;
  const newHistogramData = updateHistogramData(state);
  newHistogramData[timeInterval] = (newHistogramData[timeInterval] || 0) + 1;
  return newHistogramData;
};

// Helper to find a passenger's bag in any lane
export const findBagInLanes = (gameState: GameState, passengerId: string): Bag | null => {
  for (const lane of gameState.security_lanes) {
    const bags = getAllBagsInLane(lane);
    const bag = bags.find(b => b.passenger_id === passengerId);
    if (bag) return bag;
  }
  return null;
};

// Helper to find which lane a passenger's bag is in
export const findLaneWithBag = (gameState: GameState, passengerId: string): SecurityLane | null => {
  return gameState.security_lanes.find(lane => 
    getAllBagsInLane(lane).some(b => b.passenger_id === passengerId)
  ) || null;
};