import { debugLog, generatePassengerId, getAllLanePassengers, normalDistribution } from "./game-utils";
import { GAME_OVER_TIMEOUT_MS } from "./game-constants";
import { GameState } from "@/types/gameTypes";
import { SetStateAction } from "react";
import { Dispatch } from "react";
import { generateRandomBag } from "./game-generators";
import { GAME_TICK_MS } from "./game-constants";
import { incrementHistogramData, updateHistogramData } from "./game-utils";
import { generateRandomPassenger } from "./game-generators";

export const getTick = (gameState: GameState, setGameState: Dispatch<SetStateAction<GameState>>) => {
  return () => {
    // const loopStartTime = performance.now();
    // console.log(`Game loop starting at ${loopStartTime}`);
    
    // Update game time and process everything in a single state update
    setGameState(prevState => {
      // const updateStartTime = performance.now();
      const newState = { ...prevState };
      const currentTime = Date.now();

      // Check if the main queue is at capacity
      const isQueueAtCapacity = newState.main_queue.length >= newState.main_queue.capacity;

      if (isQueueAtCapacity) {
        if (!newState.queue_at_capacity_start_time) {
          newState.queue_at_capacity_start_time = currentTime; // Start timing
        } else if (currentTime - newState.queue_at_capacity_start_time >= GAME_OVER_TIMEOUT_MS) { // 10 seconds
          newState.paused = true;
          newState.game_over = true;
          newState.game_over_time = currentTime;

          return newState;
        }
      } else {
        newState.queue_at_capacity_start_time = null; // Reset if not at capacity
      }
      
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
              updatedLane.body_scanner.current_items.length < updatedLane.body_scanner.current_items.capacity) {
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
                newState.completed.push(passenger);
                newState.histogram_data = incrementHistogramData(newState, newState.time);
              }
            }
          }
        }
        
        // Process bag scanner
        if (updatedLane.bag_scanner.is_operational) {
          debugLog(updatedLane.id, ` Bag Scanner Status:`, JSON.stringify({
            waiting_items: updatedLane.bag_scanner.waiting_items.length,
            current_items: updatedLane.bag_scanner.current_items.length,
            off_ramp: updatedLane.bag_scanner_off_ramp.length
          }));

          // Move bags from waiting queue to scanner if there's capacity
          while (updatedLane.bag_scanner.current_items.length < updatedLane.bag_scanner.current_items.capacity && 
                updatedLane.bag_scanner.waiting_items.length > 0) {
            // Dequeue first to prevent race conditions
            const nextBag = updatedLane.bag_scanner.waiting_items.dequeue();
            if (!nextBag) {
              console.warn('No bag to add to scanner');
              break;
            }
            
            debugLog(updatedLane.id, ` Processing bag ${nextBag.id} from waiting queue`, {
              bag_id: nextBag.id,
              passenger_id: nextBag.passenger_id,
              is_being_scanned: nextBag.is_being_scanned,
              scan_complete: nextBag.scan_complete
            });
            
            // Find the passenger who owns this bag
            const passenger = getAllLanePassengers(updatedLane).find(p => p.bag?.id === nextBag.id);

            if (!passenger?.bag) {
              console.warn(`[Lane ${lane.id}] No passenger found for bag ${nextBag.id}, or passenger has no bag`);
              setGameState(prevState => ({
                ...prevState,
                paused: true,
                errors: [...prevState.errors, {
                  message: `No passenger found for bag ${nextBag.id}, or passenger has no bag`,
                  timestamp: Date.now()
                }]
              }));
              continue;
            }

            // If bag is already being scanned or complete, skip it
            if (passenger.bag.is_being_scanned || passenger.bag.scan_complete) {
              console.warn(`[Lane ${lane.id}] Bag ${nextBag.id} is already being scanned or complete, skipping`, {
                is_being_scanned: passenger.bag.is_being_scanned,
                scan_complete: passenger.bag.scan_complete
              });
              continue;
            }
            
            // Add to scanner
            const enqueueResult = updatedLane.bag_scanner.current_items.enqueue(nextBag);
            debugLog(updatedLane.id, ` Enqueue result for bag ${nextBag.id}:`, {
              success: enqueueResult !== undefined,
              scanner_length: updatedLane.bag_scanner.current_items.length,
              scanner_capacity: updatedLane.bag_scanner.current_items.capacity
            });

            updatedLane.bag_scanner.current_scan_progress[nextBag.id] = 0;
            
            // Mark bag as being scanned
            passenger.bag.is_being_scanned = true;
            passenger.bag_scanner_started_timestamp = Date.now();
          }
          
          // Process bags in scanner
          const bagsInScanner = updatedLane.bag_scanner.current_items.getAll();
          debugLog(updatedLane.id, ` Processing ${bagsInScanner.length} bags in scanner`);

          for (const bag of bagsInScanner) {
            // Find the passenger who owns this bag
            const passenger = getAllLanePassengers(updatedLane).find(p => p.bag?.id === bag.id);
            if (!passenger) {
              console.warn(`[Lane ${lane.id}] No passenger found for bag ${bag.id}, or passenger has no bag`);
              setGameState(prevState => ({
                ...prevState,
                paused: true,
                errors: [...prevState.errors, {
                  message: `No passenger found for bag ${bag.id}, or passenger has no bag`,
                  timestamp: Date.now()
                }]
              }));
              continue;
            }
            
            const passengerBag = passenger.bag!;

            // Try to move completed bags to off ramp
            let bagMoved = false;
            if (passengerBag.scan_complete) {
              debugLog(lane.id, ` Found completed bag ${bag.id} in scanner, attempting to move to off ramp`);
              
              if (updatedLane.bag_scanner_off_ramp.length < updatedLane.bag_scanner_off_ramp.capacity) {
                // Try to add to off ramp first before removing from scanner
                const offRampResult = updatedLane.bag_scanner_off_ramp.enqueue(passengerBag);
                
                if (offRampResult) {
                  // Only remove from scanner if off ramp enqueue succeeded
                  const removeResult = updatedLane.bag_scanner.current_items.removeById(passengerBag.id);
                  delete updatedLane.bag_scanner.current_scan_progress[passengerBag.id];
                  
                  debugLog(lane.id, ` Successfully moved completed bag ${passengerBag.id} to off ramp:`, {
                    removeSuccess: removeResult,
                    off_ramp_length: updatedLane.bag_scanner_off_ramp.length
                  });
                  bagMoved = true;
                } else {
                  debugLog(lane.id, ` Failed to add bag ${passengerBag.id} to off ramp, keeping in scanner`);
                }
              } else {
                debugLog(lane.id, ` Off ramp full, keeping completed bag ${passengerBag.id} in scanner`);
              }
            }

            // Skip scan progress update if bag was moved
            if (bagMoved) continue;

            // Update scan progress for incomplete bags
            const currentProgress = updatedLane.bag_scanner.current_scan_progress[bag.id] || 0;
            const progressIncrement = (updatedLane.bag_scanner.items_per_minute / 60) * (GAME_TICK_MS / 1000) * 100;
            const newProgress = Math.min(100, currentProgress + progressIncrement);
            updatedLane.bag_scanner.current_scan_progress[bag.id] = newProgress;
            
            debugLog(lane.id, ` Bag ${bag.id} scan progress:`, JSON.stringify({
              current: currentProgress,
              increment: progressIncrement,
              new: newProgress,
              is_complete: bag.scan_complete,
              is_scanning: bag.is_being_scanned
            }));
            
            // Check if scan is complete
            if (newProgress >= 100) {
              debugLog(lane.id, ` Bag ${bag.id} scan complete, checking off ramp capacity`);
              
              // Mark scan as complete regardless of off ramp status
              passengerBag.scan_complete = true;
              passenger.bag_scanner_complete_timestamp = Date.now();
              
              // Only move to off ramp if there's space
              if (updatedLane.bag_scanner_off_ramp.length < updatedLane.bag_scanner_off_ramp.capacity) {
                // Try to add to off ramp first before removing from scanner
                const offRampResult = updatedLane.bag_scanner_off_ramp.enqueue(bag);
                
                if (offRampResult) {
                  // Only update status and remove from scanner if off ramp enqueue succeeded
                  passengerBag.is_being_scanned = false;
                  const removeResult = updatedLane.bag_scanner.current_items.removeById(passengerBag.id);
                  delete updatedLane.bag_scanner.current_scan_progress[passengerBag.id];
                  
                  debugLog(lane.id, ` Successfully moved newly completed bag ${bag.id} to off ramp:`, {
                    removeSuccess: removeResult,
                    off_ramp_length: updatedLane.bag_scanner_off_ramp.length
                  });
                } else {
                  debugLog(lane.id, ` Failed to add bag ${bag.id} to off ramp, keeping in scanner`);
                }
              } else {
                debugLog(lane.id, ` Off ramp full, keeping completed bag ${bag.id} in scanner`);
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
  }
}