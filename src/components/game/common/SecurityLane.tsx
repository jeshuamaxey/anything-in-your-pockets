import { countPassengersInLane } from "@/lib/game-utils";
import { GameState, Passenger, SecurityLane } from "@/types/gameTypes";
import { PassengerLabel } from '../common/PassengerLabel';
import { BagLabel } from '../common/BagLabel';
import SecurityLaneZoneHeading from '../common/SecurityLaneZoneHeading';
import { scanBag } from "@/lib/bag-scanning";

interface SecurityLaneProps {
  lane: SecurityLane;
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
}

const SecurityLaneUI = ({lane, gameState, setGameState}: SecurityLaneProps) => {
  
  // Debug a lane
  const debugLane = (lane: SecurityLane) => {
    console.log('Lane:', lane);
  };

  const setSelectedPassenger = (passenger: Passenger | null) => {
    setGameState({...gameState, selected_passenger: passenger});
  }

  return (
    <div className="col-span-1">
      {/* Header */}
      <div className="flex justify-between items-center mb-0 p-2">
        <div className="flex gap-2 items-center" onClick={() => debugLane(lane)}>
          <h2 className="text font-bold">{lane.name}</h2>
          <p className="text-xs text-gray-500">
            Passengers in lane: {countPassengersInLane(lane)}
          </p>
        </div>
      </div>
      
      {/* Lane layout based on wireframe - 2 rows, 4 columns with arrows */}
      <div className="flex flex-col gap-0 pt-0 relative">
        {/* Top Row - Passenger Flow */}
        <div className="grid grid-cols-4 gap-0 h-[200px]">
          {/* Lane Line */}
          <div className="bg-background p-2 h-full border-t border-r border-border">
            <SecurityLaneZoneHeading title="Lane line" nItems={lane.lane_line.length} capacity={lane.lane_line.capacity} />

            <div className="overflow-y-auto h-[120px]">
              {lane.lane_line.length > 0 ? (
                <div className="space-y-1">
                  {lane.lane_line.getAll().map((passenger, idx) => (
                    <div key={`${passenger.id}-${idx}`} className="bg-white rounded text-[11px]">
                      <PassengerLabel 
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">Queue empty</div>
              )}
            </div>
          </div>

          {/* Body Scanner Line */}
          <div className="bg-background p-2 h-full border-t border-border">
            <SecurityLaneZoneHeading 
              title="Body scanner line"
              nItems={lane.body_scan_line.length}
              capacity={lane.body_scan_line.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.body_scan_line.length > 0 ? (
                <div className="space-y-1">
                  {lane.body_scan_line.getAll().map((passenger) => (
                      <PassengerLabel 
                        key={passenger.id}
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                      />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">Queue empty</div>
              )}
            </div>
          </div>

          {/* Body Scanner */}
          <div className="bg-background p-2 h-full border-t border-border">
            <SecurityLaneZoneHeading 
              title="Body scanner"
              nItems={lane.body_scanner.current_items.length}
              capacity={lane.body_scanner.current_items.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.body_scanner.current_items.length > 0 ? (
                <div className="space-y-1">
                  {lane.body_scanner.current_items.getAll().map(passenger => (
                      <PassengerLabel 
                        key={passenger.id}
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                        showProgress
                        progress={lane.body_scanner.current_scan_progress[passenger.id]}
                      />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">No passengers in scanner</div>
              )}
            </div>
          </div>

          {/* Bag Pickup */}
          <div className="bg-background p-2 h-full border-t border-border">
            <SecurityLaneZoneHeading 
              title="Bag pickup"
              nItems={lane.bag_pickup_area.length}
              capacity={lane.bag_pickup_area.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.bag_pickup_area.length > 0 ? (
                <div className="space-y-1">
                  {lane.bag_pickup_area.getAll().map((passenger) => (
                      <PassengerLabel
                        key={passenger.id}
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                      />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">No passengers waiting</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row - Bag Flow */}
        <div className="grid grid-cols-4 gap-0 h-[200px]">
          {/* Bag Drop Line */}
          <div className="bg-background p-2 h-full border-b border-border">
            <SecurityLaneZoneHeading 
              title="Bag drop line"
              nItems={lane.bag_drop_line.length}
              capacity={lane.bag_drop_line.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.bag_drop_line.length > 0 ? (
                <div className="space-y-1">
                  {lane.bag_drop_line.getAll().map((passenger) => (
                      <PassengerLabel 
                        key={passenger.id}
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                      />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">Queue empty</div>
              )}
            </div>
          </div>

          {/* Bag Drop */}
          <div className="bg-background p-2 h-full border-b border-border">
            <SecurityLaneZoneHeading 
              title="Bag drop"
              nItems={lane.bag_drop_unload.length}
              capacity={lane.bag_unloading_bays}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.bag_drop_unload.length > 0 ? (
                <div className="space-y-1">
                  {lane.bag_drop_unload.getAll().map((passenger) => (
                      <PassengerLabel 
                        key={passenger.id}
                        passenger={passenger} 
                        onClick={setSelectedPassenger}
                        showProgress={passenger.unloading_bag}
                        progress={passenger.unloading_progress}
                        />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">No passengers unloading</div>
              )}
            </div>
          </div>

          {/* Bag Scanner */}
          <div className="bg-blue-50 p-2 h-full border-l border-t border-b border-border">
            <SecurityLaneZoneHeading 
              title="Bag scanner"
              nItems={lane.bag_scanner.current_items.length}
              capacity={lane.bag_scanner.current_items.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.bag_scanner.current_items.length + lane.bag_scanner.waiting_items.length > 0 ? (
                <div className="space-y-1">
                  {lane.bag_scanner.current_items.getAll().map(bag => {
                    const alerts = scanBag(bag, lane.bag_scanner, gameState.security_policy);

                    return <BagLabel
                      key={bag.id}
                      bag={bag}
                      showProgress={bag.is_being_scanned}
                      progress={lane.bag_scanner.current_scan_progress[bag.id]}
                      showAlerts
                      alerts={alerts}
                      onClick={() => {
                        bag.suspicious_item_dealt_with = true;
                        bag.electronics_alert_dealt_with = true;
                        bag.liquids_alert_dealt_with = true;
                      }}
                    />
                  })}
                  {lane.bag_scanner.waiting_items.getAll().map(bag => {
                    return <BagLabel
                      key={bag.id}
                      bag={bag}
                      annotation="waiting..."
                    />
                  })}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">No bags in scanner</div>
              )}
            </div>
          </div>

          {/* Bag Off Ramp */}
          <div className="bg-blue-50 p-2 h-full border-b border-border">
            <SecurityLaneZoneHeading 
              title="Bag off ramp"
              nItems={lane.bag_scanner_off_ramp.length}
              capacity={lane.bag_scanner_off_ramp.capacity}
            />
            <div className="overflow-y-auto h-[120px]">
              {lane.bag_scanner_off_ramp.length > 0 ? (
                <div className="space-y-1">
                  {lane.bag_scanner_off_ramp.getAll().map(bag => (
                    <BagLabel 
                      key={bag.id}
                      bag={bag}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-xs italic">No bags waiting</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityLaneUI;