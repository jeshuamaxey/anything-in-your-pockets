import { Histogram } from "@/components/Histogram";
import { PassengerLabel } from "../common/PassengerLabel";
import { GameState } from "@/types/gameTypes";
import { Passenger } from "@/types/gameTypes";
import { Button } from "@/components/ui/button";
import StatCard from "./StatCard";
import PassengerInfo from "./PassengerInfo";
interface SystemStatusUIProps {
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
}

const SystemStatus = ({
  gameState,
  setGameState
  }: SystemStatusUIProps) => {
    const completedPassengersWithBags = gameState.completed.filter(p => !!p.bag);
    const bagsWithSuspiciousItems = completedPassengersWithBags.filter(p => p.bag?.has_suspicious_item).map(p => p.bag);
    const suspiciousItemsInvestigated = bagsWithSuspiciousItems.filter(bag => bag?.suspicious_item_dealt_with).length;
    const avTime = gameState.completed.reduce((acc, passenger) => acc + ((passenger.security_cleared_timestamp || 0) - (passenger.spawned_timestamp || 0)), 0) / ( gameState.completed.length * 1000 );

    const selectedPassenger = gameState.selected_passenger;
    const setSelectedPassenger = (passenger: Passenger | null) => {
      gameState.selected_passenger = passenger;
      setGameState({...gameState, selected_passenger: passenger});
    }

  return <>
    {/* System Status */}
    <h2 className="text font-bold p-2 border-b border-border">SYSTEM STATUS</h2>
    
    {/* Histogram */}
    <div className="mb-4 h-64 bg-white border-b border-border">
      <Histogram {...gameState} />
    </div>
    
    <div className="grid grid-cols-2 gap-2 p-2 mb-4">
      <StatCard title="Passengers processed" value={gameState.completed.length} />
      <StatCard title="Passengers with bags" value={completedPassengersWithBags.length} />
      <StatCard title="Suspicious items detected" value={suspiciousItemsInvestigated/bagsWithSuspiciousItems.length} percentage />
      <StatCard title="Av time" value={avTime} duration />
    </div>

    <div className="flex flex-row justify-between items-center p-2 border-t border-b border-border">
      <h2 className="text font-bold">
        {selectedPassenger ? selectedPassenger.emoji + " " + selectedPassenger.name : "RECENT PASSENGERS"}
      </h2>
      {selectedPassenger && (
        <Button variant="ghost" size="sm" onClick={() => setSelectedPassenger(null)} className="h-4 px-2 py-0 text-xs">
          &times;
        </Button>
      )}
    </div>
    
    {!selectedPassenger && (
      <div className="text-sm max-h-48 overflow-y-auto bg-gray-50 p-2 rounded">
        {gameState.completed.slice(-5).map((passenger, idx) => (
          <div key={`${passenger.id}-completed-${idx}`} className="text-xs flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
            <PassengerLabel 
              passenger={passenger} 
              onClick={setSelectedPassenger}
            />
          </div>
        ))}
        {gameState.completed.length > 5 && <div className="text-gray-500">...and {gameState.completed.length - 5} more</div>}
      </div>
    )}

    {/* Passenger Journey Info (when selected) */}
    {selectedPassenger && (
      <div className="p-2"> 
        <PassengerInfo passenger={selectedPassenger} />
      </div>
    )}
    </>
};

export default SystemStatus;