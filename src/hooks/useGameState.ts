import { Dispatch, SetStateAction, useState } from "react";
import { GameState, SecurityAgent, SecurityLane, Scanner, Queue, Bag, Passenger } from "@/types/gameTypes";
import {
  BAG_DROP_LINE_CAPACITY,
  BAG_PICKUP_AREA_CAPACITY,
  BAG_SCANNER_SCANNING_CAPACITY,
  BAG_SCANNER_WAITING_CAPACITY,
  BODY_SCANNER_LINE_CAPACITY,
  BODY_SCANNER_SCANNING_CAPACITY,
  BODY_SCANNER_WAITING_CAPACITY,
  INITIAL_SPAWN_RATE,
  LANE_LINE_CAPACITY,
  MAIN_LINE_CAPACITY
} from "@/lib/game-constants";

// Initialize a new game state
export const initializeGameState = (): GameState => {
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


  const scannerResponseRates: Scanner<Bag>["response_rates"][] = [{
    p_alert_given_sus_item: 0.90,
    p_alert_given_no_sus_item: 0.1,
    p_alert_given_electronics: 0.9,
    p_alert_given_liquids: 0.9
  },{
    p_alert_given_sus_item: 0.93,
    p_alert_given_no_sus_item: 0.08,
    p_alert_given_electronics: 0.8,
    p_alert_given_liquids: 0.8
  },{
    p_alert_given_sus_item: 0.95,
    p_alert_given_no_sus_item: 0.06,
    p_alert_given_electronics: 0.7,
    p_alert_given_liquids: 0.7
  },{
    p_alert_given_sus_item: 0.98,
    p_alert_given_no_sus_item: 0.05,
    p_alert_given_electronics: 0.5,
    p_alert_given_liquids: 0.5
  },{
    p_alert_given_sus_item: 0.99,
    p_alert_given_no_sus_item: 0.05,
    p_alert_given_electronics: 0.3,
    p_alert_given_liquids: 0.3
  }]

  // Create initial scanners
  const createScanner = <T extends {id: string}>(id: string, name: string, type: 'bag' | 'person'): Scanner<T> => ({
    id,
    name,
    type,
    is_operational: true,
    items_per_minute: type === 'bag' ? 10 : 0, // Only used for bag scanners now
    current_items: new Queue<T>({capacity: type === 'bag' ? BAG_SCANNER_SCANNING_CAPACITY : BODY_SCANNER_SCANNING_CAPACITY, id: `current_items_${id}`, debug: true}),
    current_scan_progress: {},
    response_rates: scannerResponseRates[0],
    last_processed_time: Date.now(),
    waiting_items: new Queue<T>({capacity: type === 'bag' ? BAG_SCANNER_WAITING_CAPACITY : BODY_SCANNER_WAITING_CAPACITY, id: `waiting_items_${id}`, debug: true}),
    current_scan_time_needed: {},
  });

  // Create initial security lanes
  const securityLaneInfo = [
    {id: 'lane_1', name: 'LANE 1'},
    {id: 'lane_2', name: 'LANE 2'}
  ];
  const securityLanes: SecurityLane[] = securityLaneInfo.map((info, index) => ({
    id: info.id,
    name: info.name,
    security_agents: [securityAgents[index], securityAgents[index + 1]],
    is_open: true,
    total_added: 0,

    // Passenger Flow Queues
    lane_line: new Queue({capacity: LANE_LINE_CAPACITY, id: `lane_line_${info.id}`}),
    bag_drop_line: new Queue({capacity: BAG_DROP_LINE_CAPACITY, id: `bag_drop_line_${info.id}`}),
    bag_drop_unload: new Queue({capacity: BAG_DROP_LINE_CAPACITY, id: `bag_drop_unload_${info.id}`, debug: true}),
    body_scan_line: new Queue({capacity: BODY_SCANNER_LINE_CAPACITY, id: `body_scan_line_${info.id}`}),
    bag_pickup_area: new Queue({capacity: BAG_PICKUP_AREA_CAPACITY, id: `bag_pickup_area_${info.id}`}),

    // Scanner States
    body_scanner: createScanner<Passenger>(`body_scanner_${info.id}`, `Body Scanner ${index}`, 'person'),
    bag_scanner: createScanner<Bag>(`bag_scanner_${info.id}`, `Bag Scanner ${index}`, 'bag'),
    bag_scanner_off_ramp: new Queue({capacity: BAG_PICKUP_AREA_CAPACITY, id: `bag_scanner_off_ramp_${info.id}`, debug: true}),

    // Configuration
    bag_unloading_bays: 3
  }));

  // Create a new game state
  return {
    errors: [],
    passengers: [],
    bags: [],
    security_agents: securityAgents,
    security_lanes: securityLanes,
    main_queue: new Queue({capacity: MAIN_LINE_CAPACITY, id: 'main_queue'}),
    security_policy: {
      bags: {
        liquids_must_be_in_clear_plastic_bag: true,
        liquids_max_volume: 100,
        electronics_must_be_separate: true,
      },
      bodies: {
        shoes_must_be_removed: true,
      }
    },
    completed: [],
    rejected: [],
    time: 0,
    spawn_rate: INITIAL_SPAWN_RATE,
    last_spawn_time: Date.now(),
    paused: true, // Ensure the game starts in a paused state
    histogram_data: { 0: 0 }, // Initialize with zero passengers at time 0
    queue_at_capacity_start_time: null,
    game_over: false,
    game_start_time: null,
    game_over_time: null,

    selected_passenger: null,
    selected_lane: null,
  };
};

const useGameState = (): [GameState, Dispatch<SetStateAction<GameState>>] => {
  const [gameState, setGameState] = useState<GameState>(initializeGameState());

  return [gameState, setGameState];
}
export default useGameState;

