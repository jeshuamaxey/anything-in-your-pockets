import { SecurityLane } from "@/types/gameTypes";

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
    lane.body_scanner.current_items.length +
    lane.passengers_unloading_bags.length
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

// Calculate duration between two timestamps
export const calculateDuration = (start?: number, end?: number) => {
  if (!start || !end) return 0;
  const durationMs = end - start;
  return durationMs / 1000; // Return duration in seconds
};

// Format duration for display
export const formatDuration = (durationSeconds: number) => {
  if (durationSeconds === 0) return 'N/A';
  return `${durationSeconds.toFixed(1)}s`;
};

// Generate a random number from a normal distribution
export const normalDistribution = (mean: number, stdDev: number): number => {
  // Box-Muller transform to generate normally distributed random numbers
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};
