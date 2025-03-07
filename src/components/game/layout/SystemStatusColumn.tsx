import { Histogram } from "@/components/Histogram";
import { PassengerLabel } from "../common/PassengerLabel";
import { GameState } from "@/types/gameTypes";
import { Passenger } from "@/types/gameTypes";
import { Button } from "@/components/ui/button";
import { calculateDuration, formatDuration } from "@/lib/game-utils";
import JourneyBarChart from "../security/JourneyBarChart";
interface SystemStatusColumnProps {
  gameState: GameState;
  setSelectedPassenger: (passenger: Passenger | null) => void;
  selectedPassenger: Passenger | null;
}

const SystemStatusColumn = ({
  gameState,
  setSelectedPassenger,
  selectedPassenger
  }: SystemStatusColumnProps) => {
  return <>
    {/* System Status */}
    <h2 className="text-xl font-bold mb-3">SYSTEM STATUS</h2>
    
    {/* Histogram */}
    <div className="mb-4 h-64 border border-gray-200 rounded p-2 bg-white">
      <Histogram {...gameState} />
    </div>
    
    <div className="grid grid-cols-1 gap-2 mb-4">
      <div className="p-2 bg-gray-50 rounded">Completed Passengers: {gameState.completed.length}</div>
    </div>
    
    <div className="text-sm max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
      {gameState.completed.slice(-5).map((passenger, idx) => (
        <div key={`${passenger.id}-completed-${idx}`} className="text-xs flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
          <PassengerLabel 
            passenger={passenger} 
            onClick={setSelectedPassenger}
            showDetails={true}
          />
        </div>
      ))}
      {gameState.completed.length > 5 && <div className="text-gray-500">...and {gameState.completed.length - 5} more</div>}
    </div>

    {/* Passenger Journey Info (when selected) */}
    {selectedPassenger && (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex justify-between">
          <h3 className="font-bold text-base mb-2">{selectedPassenger.name}&apos;s Journey</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedPassenger(null)}
            className="h-7 px-2 py-0 text-xs"
            >
            &times;
          </Button>
        </div>
        
        {/* Passenger Info */}
        <div className="mb-3">
          <div className="text-xs mb-1"><span className="font-medium">Nationality:</span> {selectedPassenger.nationality.emoji}</div>
          <div className="text-xs mb-1"><span className="font-medium">Security Familiarity:</span> {selectedPassenger.security_familiarity}/10</div>
          <div className="text-xs mb-1"><span className="font-medium">Has Bag:</span> {selectedPassenger.has_bag ? 'Yes' : 'No'}</div>
        </div>
        
        {/* Journey Bar Chart */}
        <div className="mb-3">
          <JourneyBarChart passenger={selectedPassenger} />
        </div>
        
        {/* Detailed Timeline */}
        <div className="space-y-1 text-xs">
          <div className="grid grid-cols-2 gap-1 p-1 bg-blue-50 rounded">
            <div><span className="font-medium">Main Queue Wait:</span></div>
            <div>{formatDuration(calculateDuration(selectedPassenger.spawned_timestamp, selectedPassenger.security_lane_queue_assigned_timestamp))}</div>
          </div>
          
          {selectedPassenger.has_bag && (
            <>
              <div className="grid grid-cols-2 gap-1 p-1 bg-green-50 rounded">
                <div><span className="font-medium">Bag Unload:</span></div>
                <div>{formatDuration(calculateDuration(selectedPassenger.bag_unload_started_timestamp, selectedPassenger.bag_unload_completed_timestamp))}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-1 p-1 bg-yellow-50 rounded">
                <div><span className="font-medium">Bag Scan:</span></div>
                <div>{formatDuration(calculateDuration(selectedPassenger.bag_scanner_started_timestamp, selectedPassenger.bag_scanner_complete_timestamp))}</div>
              </div>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-1 p-1 bg-purple-50 rounded">
            <div><span className="font-medium">Body Scanner Queue:</span></div>
            <div>{formatDuration(calculateDuration(selectedPassenger.body_scanner_queue_joined_timestamp, selectedPassenger.body_scanner_started_timestamp))}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 p-1 bg-red-50 rounded">
            <div><span className="font-medium">Body Scan:</span></div>
            <div>{formatDuration(calculateDuration(selectedPassenger.body_scanner_started_timestamp, selectedPassenger.body_scanner_finished_timestamp))}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 p-1 bg-orange-50 rounded">
            <div><span className="font-medium">Waiting for Bag:</span></div>
            <div>{formatDuration(calculateDuration(selectedPassenger.waiting_for_bag_started_timestamp, selectedPassenger.waiting_for_bag_finished_timestamp))}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded mt-2">
            <div><span className="font-medium">Total Time:</span></div>
            <div>{formatDuration(calculateDuration(selectedPassenger.spawned_timestamp, selectedPassenger.security_cleared_timestamp))}</div>
          </div>
        </div>
      </div>
    )}
    </>
};

export default SystemStatusColumn;