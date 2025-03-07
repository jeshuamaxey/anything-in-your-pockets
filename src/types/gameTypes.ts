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
  nationality: Nationality;
  security_familiarity: number; // 0 to 10
  sex: Sex;
  presenting_gender: PresentingGender;
  preferred_security_agent_gender: PreferredSecurityAgentGender;
  has_bag: boolean; // Whether the passenger has a bag
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

// Queue definition - an ordered array of passengers
export class Queue {
  private passengers: Passenger[];
  public capacity: number;
  public id: string;

  constructor({capacity, id}: {capacity: number, id: string}) {
    this.passengers = [];
    this.capacity = capacity;
    this.id = id;
  }
  
  // Add a passenger to the end of the queue
  enqueue(passenger: Passenger): void {
    console.log(`Queue.enqueue called for passenger ${passenger.id}`);
    // Check if passenger is already in the queue
    const existingPassenger = this.passengers.find(p => p.id === passenger.id);
    if (existingPassenger) {
      console.warn(`Passenger ${passenger.id} is already in the queue!`);
      return;
    }
    if(this.passengers.length >= this.capacity) {
      console.warn(`Queue ${this.id} is at capacity!`);
      return;
    }
    this.passengers.push(passenger);
  }
  
  // Remove and return the passenger from the front of the queue
  dequeue(): Passenger | undefined {
    return this.passengers.shift();
  }
  
  // Look at the passenger at the front of the queue without removing
  peek(): Passenger | undefined {
    return this.passengers[0];
  }
  
  // Get the number of passengers in the queue
  get length(): number {
    return this.passengers.length;
  }
  
  // Check if the queue is empty
  isEmpty(): boolean {
    return this.passengers.length === 0;
  }
  
  // Get all passengers in the queue
  getAll(): Passenger[] {
    return [...this.passengers];
  }
  
  // Find a passenger by ID
  findById(id: string): Passenger | undefined {
    return this.passengers.find(passenger => passenger.id === id);
  }
  
  // Remove a passenger by ID
  removeById(id: string): boolean {
    const initialLength = this.passengers.length;
    this.passengers = this.passengers.filter(passenger => passenger.id !== id);
    return initialLength !== this.passengers.length;
  }
}

// Bag Queue definition - an ordered array of bags
export class BagQueue {
  private bags: Bag[];
  public id: string;
  
  constructor({id}: {id: string}) {
    this.bags = [];
    this.id = id;
  }
  
  // Add a bag to the end of the queue
  enqueue(bag: Bag): void {
    this.bags.push(bag);
  }
  
  // Remove and return the bag from the front of the queue
  dequeue(): Bag | undefined {
    return this.bags.shift();
  }
  
  // Look at the bag at the front of the queue without removing
  peek(): Bag | undefined {
    return this.bags[0];
  }
  
  // Get the number of bags in the queue
  get length(): number {
    return this.bags.length;
  }
  
  // Check if the queue is empty
  isEmpty(): boolean {
    return this.bags.length === 0;
  }
  
  // Get all bags in the queue
  getAll(): Bag[] {
    return [...this.bags];
  }
  
  // Find a bag by ID
  findById(id: string): Bag | undefined {
    return this.bags.find(bag => bag.id === id);
  }
  
  // Find bags by passenger ID
  findByPassengerId(passengerId: string): Bag[] {
    return this.bags.filter(bag => bag.passenger_id === passengerId);
  }
  
  // Remove a bag by ID
  removeById(id: string): boolean {
    const initialLength = this.bags.length;
    this.bags = this.bags.filter(bag => bag.id !== id);
    return initialLength !== this.bags.length;
  }
}

// Scanner definition
export interface Scanner {
  id: string;
  name: string;
  type: 'bag' | 'person';
  is_operational: boolean;
  items_per_minute: number; // Number of items that can be processed per minute
  current_items: string[]; // IDs of items currently being scanned
  capacity: number; // Maximum number of items that can be scanned simultaneously
  current_scan_progress: Record<string, number>; // Progress of current scans (0-100%) by item ID
  scan_accuracy: number; // Accuracy of the scanner (0-100%)
  last_processed_time: number; // Last time the scanner processed items (in ms)
  waiting_items: string[]; // IDs of items waiting to be scanned
  current_scan_time_needed?: Record<string, number>; // Time needed to complete scan for each item (in seconds)
}

// Security Lane definition
export interface SecurityLane {
  id: string;
  name: string;
  security_agents: SecurityAgent[];
  passenger_queue: Queue;
  bag_scanner: Scanner;
  person_scanner: Scanner;
  bag_inspection_queue: BagQueue;
  is_open: boolean;
  processing_capacity: number;
  current_processing_count: number;
  passengers_in_body_scanner_queue: Passenger[];
  passengers_waiting_for_bags: Passenger[];
  passengers_completed: Passenger[];
  bag_unloading_bays: number;
  passengers_unloading_bags: Passenger[];
  bag_scanner_queue: Passenger[];
}

// Game state
export interface GameState {
  passengers: Passenger[];
  bags: Bag[];
  security_agents: SecurityAgent[];
  security_lanes: SecurityLane[]; // Array of security lanes
  main_queue: Queue; // Main queue of passengers waiting to be assigned to a lane
  completed: Passenger[]; // Passengers that have completed security
  rejected: Passenger[]; // Passengers that have been rejected
  time: number; // Game time in seconds
  spawn_rate: number; // Passengers per minute that spawn
  last_spawn_time: number; // Last time a passenger was spawned (in ms)
  paused: boolean; // Whether the game is paused
  histogram_data: Record<number, number>; // Key: time interval (in seconds), Value: number of passengers processed
} 