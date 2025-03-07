import { Nationality } from "@/game-data/nationalities";

// Type definitions
export type Sex = 'male' | 'female';
export type PresentingGender = 'male' | 'female' | 'ambiguous';
export type PreferredSecurityAgentGender = 'male' | 'female' | null;
export type SecurityAgentRank = 'jnr' | 'mid' | 'snr' | 'supervisor';

// Passenger definition
export interface Passenger {
  id: string;
  name: string;
  emoji: string;
  nationality: Nationality;
  security_familiarity: number; // 0 to 10
  sex: Sex;
  presenting_gender: PresentingGender;
  preferred_security_agent_gender: PreferredSecurityAgentGender;
  has_bag: boolean; // Whether the passenger has a bag
  bag: Bag | null;
  bag_on_person: boolean; // Whether the bag is on the person
  waiting_since?: number; // Timestamp when the passenger started waiting for bags
  unloading_bag?: boolean; // Whether the passenger is currently unloading their bag
  unloading_progress?: number; // Progress of unloading bag (0-100%)
  unloading_start_time?: number; // When the passenger started unloading their bag
  
  // Timestamps for tracking passenger journey
  spawned_timestamp?: number; // When the passenger was created
  security_lane_queue_assigned_timestamp?: number; // When the passenger was assigned to a security lane
  bag_unload_started_timestamp?: number; // When the passenger started unloading their bag
  bag_unload_completed_timestamp?: number; // When the passenger finished unloading their bag
  body_scanner_queue_joined_timestamp?: number; // When the passenger joined the body scanner queue
  body_scanner_started_timestamp?: number; // When the passenger started being scanned
  body_scanner_finished_timestamp?: number; // When the passenger finished being scanned
  waiting_for_bag_started_timestamp?: number; // When the passenger started waiting for their bag
  waiting_for_bag_finished_timestamp?: number; // When the passenger finished waiting for their bag
  bag_scanner_started_timestamp?: number; // When the passenger's bag started scanning
  bag_scanner_complete_timestamp?: number; // When the passenger's bag completed scanning
  security_cleared_timestamp?: number; // When the passenger cleared security
}

// Bag definition
export interface Bag {
  id: string;
  passenger_id: string;
  passenger_name: string;
  has_electronics: boolean;
  has_suspicious_item: boolean;
  has_liquids: boolean;
  is_being_scanned: boolean; // Whether the bag is currently being scanned
  is_flagged: boolean; // Whether the bag has been flagged for inspection
  scan_complete: boolean; // Whether the bag has completed scanning
  is_unloaded: boolean; // Whether the bag has been unloaded onto the scanner belt
}

// Security Agent definition
export interface SecurityAgent {
  id: string;
  name: string;
  rank: SecurityAgentRank;
  sex: Sex;
  is_available: boolean;
  current_passenger_id: string | null;
}

const generateItemLabel = (id: string) => {
  return id.split('_')[0][0] + '_' + id.slice(-3);
}

// Queue definition - an ordered array of passengers
export class Queue<T extends {id: string, debug?: boolean}> {
  private items: T[];
  public capacity: number;
  public id: string;
  public debug: boolean;

  constructor({capacity, id, debug = false}: {capacity: number, id: string, debug?: boolean}) {
    if(capacity < 1) {
      throw new Error('Capacity must be at least 1');
    }

    this.items = [];
    this.capacity = capacity;
    this.id = id;
    this.debug = debug;
  }
  
  // Add a passenger to the end of the queue
  enqueue(item: T): T | undefined {
    // Check if passenger is already in the queue
    const existingItem = this.items.find(existingItem => existingItem.id === item.id);
    if (existingItem) {
      console.warn(`Queue ${this.id}: Item ${item.id} is already in the queue!`);
      return undefined;
    }
    if(this.items.length === this.capacity) {
      console.warn(`Queue ${this.id}: At capacity (${this.capacity})!`);
      return undefined;
    }
    this.items.push(item);

    if(this.debug) {
      console.log(`Queue ${this.id}: ${generateItemLabel(item.id)} enqueued (${this.items.length}/${this.capacity})`);
    }
    return item;
  }
  
  // Remove and return the passenger from the front of the queue
  dequeue(): T | undefined {
    const item = this.items.shift();
    
    if(this.debug) {
      if(item) {
        console.log(`Queue ${this.id}: ${generateItemLabel(item.id)} dequeued (${this.items.length}/${this.capacity})`);
      } else {
        console.log(`Queue ${this.id}: dequeue failed - queue empty`);
      }
    }

    return item;
  }
  
  // Look at the passenger at the front of the queue without removing
  peek(): T | undefined {
    return this.items[0];
  }
  
  // Get the number of passengers in the queue
  get length(): number {
    return this.items.length;
  }
  
  // Check if the queue is empty
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  // Get all passengers in the queue
  getAll(): T[] {
    return [...this.items];
  }
  
  // Find a passenger by ID
  findById(id: string): T | undefined {
    return this.items.find(item => item.id === id);
  }
  
  // Remove a passenger by ID
  removeById(id: string): boolean {
    const initialLength = this.items.length;
    this.items = this.items.filter(item => item.id !== id);
    const removed = initialLength !== this.items.length;
    
    if(this.debug && removed) {
      console.log(`Queue ${this.id}: Item ${id} removed by ID (${this.items.length}/${this.capacity})`);
    }
    
    return removed;
  }
}

// Bag Queue definition - an ordered array of bags
export class BagQueue extends Queue<Bag> {
  constructor({capacity, id}: {capacity: number, id: string}) {
    super({capacity, id});
  }
  
  // Find bags by passenger ID
  findByPassengerId(passengerId: string): Bag[] {
    return this.getAll().filter(bag => bag.passenger_id === passengerId);
  }
}

// Scanner definition
export interface Scanner<T extends {id: string}> {
  id: string;
  name: string;
  type: 'bag' | 'person';
  is_operational: boolean;
  items_per_minute: number; // Number of items that can be processed per minute
  current_items: Queue<T>; // Items currently being scanned
  current_scan_progress: Record<string, number>; // Progress of current scans (0-100%) by item ID
  scan_accuracy: number; // Accuracy of the scanner (0-100%)
  last_processed_time: number; // Last time the scanner processed items (in ms)
  waiting_items: Queue<T>; // IDs of items waiting to be scanned
  current_scan_time_needed?: Record<string, number>; // Time needed to complete scan for each item (in seconds)
}

export interface SecurityLane {
  id: string;
  name: string;
  security_agents: SecurityAgent[];
  is_open: boolean;
  total_added: number; // Total number of passengers that have entered this lane

  // Passenger Flow Queues (primary source of truth)
  lane_line: Queue<Passenger>;          // Initial lane queue
  bag_drop_line: Queue<Passenger>;      // Waiting to unload bags
  bag_drop_unload: Queue<Passenger>;    // Currently unloading bags
  body_scan_line: Queue<Passenger>;     // Waiting for body scan
  bag_pickup_area: Queue<Passenger>;    // Waiting to collect bags

  // Scanner States
  body_scanner: Scanner<Passenger>;     // Body scanner state and queue
  bag_scanner: Scanner<Bag>;           // Bag scanner state and queue
  bag_scanner_off_ramp: Queue<Bag>;    // Completed bags waiting for pickup

  // Configuration
  bag_unloading_bays: number;          // Number of simultaneous bag unloading spots

  // Completed passengers are tracked in GameState.completed
  // All passenger data should be accessed through the queues above
}

export interface Error {
  message: string;
  timestamp: number;
}

// Game state
export interface GameState {
  passengers: Passenger[];
  bags: Bag[];
  security_agents: SecurityAgent[];
  security_lanes: SecurityLane[]; // Array of security lanes
  main_queue: Queue<Passenger>; // Main queue of passengers waiting to be assigned to a lane
  completed: Passenger[]; // Passengers that have completed security
  rejected: Passenger[]; // Passengers that have been rejected
  time: number; // Game time in seconds
  spawn_rate: number; // Passengers per minute that spawn
  last_spawn_time: number; // Last time a passenger was spawned (in ms)
  paused: boolean; // Whether the game is paused
  histogram_data: Record<number, number>; // Key: time interval (in seconds), Value: number of passengers processed
  errors: Error[];

  game_start_time: number | null; // Last time the game was started (in ms)
  game_over_time: number | null; // Last time the game was over (in ms)
  queue_at_capacity_start_time: number | null; // Last time the queue was at capacity (in ms)
  game_over: boolean; // Whether the game is over
}