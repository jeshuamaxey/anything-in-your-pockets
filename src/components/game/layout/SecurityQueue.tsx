import { LANE_LINE_CAPACITY, MAIN_LINE_CAPACITY } from "@/lib/game-constants";

import { Passenger, GameState } from "@/types/gameTypes";
import { PassengerLabel } from "../common/PassengerLabel";
import { Button } from "@/components/ui/button";
import { MAX_QUEUE_DISPLAY_LENGTH } from "@/lib/game-constants";
import { assignPassengerToLane } from "@/lib/game-logic";

interface SecurityQueueProps {
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
  setSelectedPassenger: (passenger: Passenger) => void;
}

const SecurityQueue = ({
  gameState,
  setGameState,
  setSelectedPassenger,
}: SecurityQueueProps) => {
  // Get a limited number of passengers from the main queue to display
  const getDisplayPassengers = () => {
    return gameState.main_queue.getAll().slice(0, MAX_QUEUE_DISPLAY_LENGTH); // Only show up to 5 passengers
  };

  return <>
    <div className="p-4 border-b border-gray-300">
      <h2 className="text-xl font-bold mb-3">SECURITY QUEUE</h2>
      
      {/* Queue Capacity Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Queue Capacity: {gameState.main_queue.length}/{MAIN_LINE_CAPACITY}</span>
          <span>{Math.round((gameState.main_queue.length / MAIN_LINE_CAPACITY) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              (gameState.main_queue.length / MAIN_LINE_CAPACITY) * 100 < 50 ? 'bg-green-500' : 
              (gameState.main_queue.length / MAIN_LINE_CAPACITY) * 100 < 70 ? 'bg-yellow-500' : 
              (gameState.main_queue.length / MAIN_LINE_CAPACITY) * 100 < 90 ? 'bg-orange-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${Math.min((gameState.main_queue.length / MAIN_LINE_CAPACITY) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>

    {/* Scrollable Queue List */}
    <div className="flex-1 max-h-[calc(100%-100px)] overflow-y-auto p-2">
      {getDisplayPassengers().map((passenger, index) => (
        <div key={`${passenger.id}-${index}`} className="p-2 bg-white border border-gray-300 text-sm mb-2">
          <PassengerLabel 
            passenger={passenger} 
            onClick={setSelectedPassenger}
            showDetails={true}
          />
          <div className="mt-1">
            <div className="text-xs font-semibold mb-1">Assign to lane:</div>
            <div className="flex flex-row flex-wrap gap-1">
              {gameState.security_lanes.slice(0, 2).map(lane => {
                const laneIsDisabled = lane.lane_line.length >= LANE_LINE_CAPACITY;
                return (
                  <Button 
                    key={lane.id}
                    variant="outline"
                    disabled={laneIsDisabled}
                    size="sm"
                    onClick={() => assignPassengerToLane(gameState, setGameState, passenger.id, lane.id)}
                    className="h-7 px-2 py-1 text-xs"
                  >
                    {laneIsDisabled ? '🔴' : '🟢'} {lane.name}
                  </Button>
                )})}
            </div>
          </div>
        </div>
      ))}
    {gameState.main_queue.length > MAX_QUEUE_DISPLAY_LENGTH && (
        <div className="p-2 bg-gray-200 rounded text-sm text-center">
          +{gameState.main_queue.length - MAX_QUEUE_DISPLAY_LENGTH} more passengers
        </div>
      )}
    </div>
  </>
};

export default SecurityQueue;
