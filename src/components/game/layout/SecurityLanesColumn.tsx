import React from 'react';
import { Passenger, SecurityLane, GameState } from '@/types/gameTypes';
import { PassengerLabel } from '../common/PassengerLabel';
import { countPassengersInLane, getAllBagsInLane } from '@/lib/game-utils';
import { Button } from '@/components/ui/button';
import { BagLabel } from '../common/BagLabel';

interface SecurityLanesColumnProps {
  gameState: GameState;
  onSelectPassenger: (passenger: Passenger) => void;
}

export const SecurityLanesColumn = ({
  gameState,
  onSelectPassenger,
}: SecurityLanesColumnProps) => {

  // Debug a lane
  const debugLane = (lane: SecurityLane) => {
    console.log('Lane:', lane);
    
    // Format the lane data for display
    const laneInfo = `
      Lane: ${lane.name}
      Lane Line: ${lane.lane_line.length}
      Bag Drop Line: ${lane.bag_drop_line.length}
      Bag Drop Unload: ${lane.bag_drop_unload.length}
      Body Scanner Line: ${lane.body_scan_line.length}
      Bag Pickup Area: ${lane.bag_pickup_area.length}
      Completed: ${lane.passengers_completed.length}
      Processing: ${countPassengersInLane(lane)}
    `;
    
    alert(laneInfo);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Security Lanes */}
      <div className="flex flex-col">
        {/* Security Lanes */}
        {gameState.security_lanes.slice(0, 2).map((lane, laneIndex) => {
          return (
          <div key={`${lane.id}-${laneIndex}`} className="col-span-1 border first:border-t-0 border-l-0 border-b-0 border-gray-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 p-2">
              <div className="flex gap-2 items-center">
                <h2 className="text font-bold">{lane.name}</h2>
                <p className="text-xs text-gray-500">Passengers in lane: {countPassengersInLane(lane)}
                    &nbsp;| sense check: {lane.total_added - (lane.passengers_completed.length || 0)}
                    &nbsp;| bags in lane: {getAllBagsInLane(lane).length}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => debugLane(lane)}
                className="h-7 px-2 py-1 text-xs bg-gray-100"
              >
                Debug
              </Button>
            </div>
            
            {/* Lane layout based on wireframe - 2 rows, 4 columns with arrows */}
            <div className="flex flex-col gap-0 min-h-[450px] p-2 relative">
              {/* Top Row - Passenger Flow */}
              <div className="grid grid-cols-4 gap-0 h-[200px]">
                {/* Lane Line */}
                <div className="bg-gray-100 p-2 h-full border-l border-t border-r border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Lane line</h3>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{lane.lane_line.length} / {lane.lane_line.capacity}</span>
                  </div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.lane_line.length > 0 ? (
                      <div className="space-y-1">
                        {lane.lane_line.getAll().map((passenger, idx) => (
                          <div key={`${passenger.id}-${idx}`} className="bg-white rounded text-[11px]">
                            <PassengerLabel 
                              passenger={passenger} 
                              onClick={onSelectPassenger}
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
                <div className="bg-gray-100 p-2 h-full border-t border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Body scanner line</h3>
                  <div className="text-xs mb-1">{lane.body_scan_line.length} / {lane.body_scan_line.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.body_scan_line.length > 0 ? (
                      <div className="space-y-1">
                        {lane.body_scan_line.getAll().map((passenger) => (
                            <PassengerLabel 
                              key={passenger.id}
                              passenger={passenger} 
                              onClick={onSelectPassenger}
                            />
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">Queue empty</div>
                    )}
                  </div>
                </div>

                {/* Body Scanner */}
                <div className="bg-gray-100 p-2 h-full border-t border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Body scanner</h3>
                  <div className="text-xs mb-1">{lane.body_scanner.current_items.length} / {lane.body_scanner.current_items.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.body_scanner.current_items.length > 0 ? (
                      <div className="space-y-1">
                        {lane.body_scanner.current_items.getAll().map(passenger => (
                            <PassengerLabel 
                              key={passenger.id}
                              passenger={passenger} 
                              onClick={onSelectPassenger}
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
                <div className="bg-gray-100 p-2 h-full border-t border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Bag pickup</h3>
                  <div className="text-xs mb-1">{lane.bag_pickup_area.length} / {lane.bag_pickup_area.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.bag_pickup_area.length > 0 ? (
                      <div className="space-y-1">
                        {lane.bag_pickup_area.getAll().map((passenger) => (
                            <PassengerLabel
                              key={passenger.id}
                              passenger={passenger} 
                              onClick={onSelectPassenger}
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
                <div className="bg-gray-100 p-2 h-full border-l border-b border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Bag drop line</h3>
                  <div className="text-xs mb-1">{lane.bag_drop_line.length} / {lane.bag_drop_line.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.bag_drop_line.length > 0 ? (
                      <div className="space-y-1">
                        {lane.bag_drop_line.getAll().map((passenger) => (
                            <PassengerLabel 
                              key={passenger.id}
                              passenger={passenger} 
                              onClick={onSelectPassenger}
                            />
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">Queue empty</div>
                    )}
                  </div>
                </div>

                {/* Bag Drop */}
                <div className="bg-gray-100 p-2 h-full border-b border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Bag drop</h3>
                  <div className="text-xs mb-1">{lane.bag_drop_unload.length} / {lane.bag_unloading_bays}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.bag_drop_unload.length > 0 ? (
                      <div className="space-y-1">
                        {lane.bag_drop_unload.getAll().map((passenger) => (
                            <PassengerLabel 
                              key={passenger.id}
                              passenger={passenger} 
                              onClick={onSelectPassenger}
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
                <div className="bg-blue-50 p-2 h-full border-l border-t border-b border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Bag scanner</h3>
                  <div className="text-xs mb-1">{lane.bag_scanner.current_items.length} / {lane.bag_scanner.current_items.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.bag_scanner.current_items.length + lane.bag_scanner.waiting_items.length > 0 ? (
                      <div className="space-y-1">
                        {lane.bag_scanner.current_items.getAll().map(bag => {
                          return <BagLabel
                            key={bag.id}
                            bag={bag}
                            showProgress={bag.is_being_scanned}
                            progress={lane.bag_scanner.current_scan_progress[bag.id]}
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
                <div className="bg-blue-50 p-2 h-full border-r border-b border-gray-300">
                  <h3 className="font-semibold text-sm mb-2">Bag off ramp</h3>
                  <div className="text-xs mb-1">{lane.bag_scanner_off_ramp.length} / {lane.bag_scanner_off_ramp.capacity}</div>
                  <div className="overflow-y-auto h-[120px]">
                    {lane.bag_scanner_off_ramp.length > 0 ? (
                      <div className="space-y-1">
                        {lane.bag_scanner_off_ramp.getAll().map(bag => {
                          const passenger = gameState.passengers.find(p => p.bag?.id === bag.id);
                          return passenger?.bag ? (
                            <BagLabel 
                              key={bag.id}
                              bag={bag}
                            />
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">No bags waiting</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  );
}; 