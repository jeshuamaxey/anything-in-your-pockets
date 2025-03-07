export const GAME_TICK_MS = 100; // Update game state every 100ms

export const INITIAL_PASSENGERS = 3; // Number of passengers to spawn initially
export const INITIAL_SPAWN_RATE = 10; // passengers per minute (changed from 100 to a more reasonable value)

export const HISTOGRAM_INTERVAL = 30; // Seconds per histogram bar
export const MAX_QUEUE_DISPLAY_LENGTH = 10; // Maximum number of passengers to display in the queue

export const UNLOADING_ASSISTANCE_THRESHOLD = 15; // seconds

export const MAIN_LINE_CAPACITY = 10; // Maximum number of passengers in the security queue
export const LANE_LINE_CAPACITY = 10; // Maximum number of passengers in a security lane queue
export const BAG_DROP_LINE_CAPACITY = 6; // Maximum number of bags in the bag queue
export const BAG_DROP_UNLOAD_CAPACITY = 3; // Maximum number of bags in the bag queue
export const BODY_SCANNER_LINE_CAPACITY = 6; // Maximum number of bags that can be scanned simultaneously
export const BAG_PICKUP_AREA_CAPACITY = 100; // Maximum number of bags in the bag pickup area

export const BAG_SCANNER_CAPACITY = 3; // Maximum number of bags that can be scanned simultaneously
export const BODY_SCANNER_CAPACITY = 1; // Maximum number of people that can be scanned simultaneously

export const PROPORTION_OF_PASSENGERS_WITH_BAGS = 0.5; // chance per spawned passenger
