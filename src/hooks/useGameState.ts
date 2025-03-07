import { Dispatch, SetStateAction, useState } from "react";
import { GameState, SecurityAgent, SecurityLane, Scanner, Queue, BagQueue } from "@/types/gameTypes";
import { INITIAL_SPAWN_RATE, SECURITY_LANE_QUEUE_CAPACITY, SECURITY_QUEUE_CAPACITY } from "@/lib/game-constants";

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
  const securityLaneInfo = [{id: 'lane_1', name: 'LANE 1'}, {id: 'lane_2', name: 'LANE 2'}];
  const securityLanes: SecurityLane[] = securityLaneInfo.map((info, index) => ({
      id: info.id,
      name: info.name,
      security_agents: [securityAgents[index], securityAgents[index + 1]],
      passenger_queue: new Queue({capacity: SECURITY_LANE_QUEUE_CAPACITY, id: `passenger_queue_${info.id}`}),
      bag_scanner: createScanner(`bag_scanner_${info.id}`, `Bag Scanner ${index}`, 'bag'),
      person_scanner: createScanner(`person_scanner_${info.id}`, `Person Scanner ${index}`, 'person'),
      bag_inspection_queue: new BagQueue({id: `bag_inspection_queue_${info.id}`}),
      is_open: true,
      processing_capacity: 5,
      current_processing_count: 0,
      passengers_in_body_scanner_queue: [],
      passengers_waiting_for_bags: [],
      passengers_completed: [],
      bag_unloading_bays: 3, // 3 positions at the front of the queue can unload bags
      passengers_unloading_bags: [],
      bag_scanner_queue: [] // Initialize the bag scanner queue as an empty array
    })
  );

  // Create a new game state
  return {
    passengers: [],
    bags: [],
    security_agents: securityAgents,
    security_lanes: securityLanes,
    main_queue: new Queue({capacity: SECURITY_QUEUE_CAPACITY, id: 'main_queue'}),
    completed: [],
    rejected: [],
    time: 0,
    spawn_rate: INITIAL_SPAWN_RATE,
    last_spawn_time: Date.now(),
    paused: true, // Ensure the game starts in a paused state
    histogram_data: { 0: 0 } // Initialize with zero passengers at time 0
  };
};

const useGameState = (): [GameState, Dispatch<SetStateAction<GameState>>] => {
  const [gameState, setGameState] = useState<GameState>(initializeGameState());

  return [gameState, setGameState];
}

export default useGameState;
