import React from 'react';
import { Passenger, SecurityLane, GameState } from '@/types/gameTypes';
import { PassengerLabel } from '../common/PassengerLabel';
import { countPassengersInLane } from '@/lib/game-utils';
import { Button } from '@/components/ui/button';

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
      Queue Length: ${lane.passenger_queue.length}
      Bag Scanner Queue: ${lane.bag_scanner_queue.length}
      Body Scanner Queue: ${lane.passengers_in_body_scanner_queue.length}
      Waiting for Bags: ${lane.passengers_waiting_for_bags.length}
      Completed: ${lane.passengers_completed.length}
      Processing: ${lane.current_processing_count}/${lane.processing_capacity}
    `;
    
    alert(laneInfo);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Security Lanes */}
      <div className="flex flex-col">
        {/* Security Lanes */}
        {gameState.security_lanes.slice(0, 2).map((lane, laneIndex) => (
          <div key={`${lane.id}-${laneIndex}`} className="col-span-1 border first:border-t-0 border-l-0 border-b-0 border-gray-300 p-2">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-2 items-center">
                <h2 className="text font-bold">{lane.name}</h2>
                <p className="text-xs text-gray-500">Passengers in lane: {countPassengersInLane(lane)}</p>
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
            
            {/* Lane layout based on wireframe - 4 column layout */}
            <div className="grid grid-cols-4 gap-2 min-h-[450px]">
              {/* Column 1: Lane Queue (full height) */}
              <div className="col-span-1 border border-gray-200 rounded p-2 h-full">
                <h3 className="font-semibold text-sm mb-2">Lane queue</h3>
                <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{lane.passenger_queue.length} / {lane.passenger_queue.capacity}</span>
                    <span>{Math.round((lane.passenger_queue.length / lane.passenger_queue.capacity) * 100)}%</span>
                  </div>
                  
                  {/* Queue Capacity Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div 
                      className={`h-1.5 rounded-full ${
                        (lane.passenger_queue.length / lane.passenger_queue.capacity) * 100 < 50 ? 'bg-green-500' : 
                        (lane.passenger_queue.length / lane.passenger_queue.capacity) * 100 < 70 ? 'bg-yellow-500' : 
                        (lane.passenger_queue.length / lane.passenger_queue.capacity) * 100 < 90 ? 'bg-orange-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((lane.passenger_queue.length / lane.passenger_queue.capacity) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="overflow-y-auto h-[calc(100%-2rem)]">
                    {lane.passenger_queue.length > 0 ? (
                      <div className="bg-gray-100 p-1 rounded">
                        {lane.passenger_queue.getAll().map((passenger, idx) => (
                          <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-0">
                            <PassengerLabel 
                              passenger={passenger} 
                              onClick={onSelectPassenger}
                              showDetails={false}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic">Queue empty</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Column 2: Scanner Queues */}
              <div className="col-span-1 flex flex-col space-y-3">
                {/* Bag Scanner Queue */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">Bag scanner queue</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="text-xs mb-1">{lane.bag_scanner_queue.length} / {lane.bag_scanner.capacity}</div>
                    
                    <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                      {lane.bag_scanner_queue.length > 0 ? (
                        <div className="bg-gray-100 p-1 rounded">
                          {lane.bag_scanner_queue.map((passenger, idx) => {
                            const isUnloading = passenger.unloading_bag;
                            const isWaiting = idx >= lane.bag_unloading_bays;
                            return (
                              <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <PassengerLabel 
                                      passenger={passenger} 
                                      onClick={onSelectPassenger}
                                      showDetails={false}
                                    />
                                    {!isUnloading && isWaiting && (
                                      <span className="text-gray-400 text-[10px] italic">waiting</span>
                                    )}
                                  </div>
                                  {passenger.unloading_bag && (
                                    <div className="flex items-center ml-2">
                                      <div className="w-10 bg-gray-200 rounded-full h-1.5 mr-1">
                                        <div 
                                          className="bg-blue-500 h-1.5 rounded-full" 
                                          style={{width: `${Math.floor(passenger.unloading_progress || 0)}%`}}
                                        ></div>
                                      </div>
                                      <span className="text-xs">{Math.floor(passenger.unloading_progress || 0)}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic">Queue empty</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Body Scanner Queue */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">Body scanner queue</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="text-xs mb-1">{lane.passengers_in_body_scanner_queue.length} / {lane.person_scanner.capacity}</div>
                    
                    <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                      {lane.passengers_in_body_scanner_queue.length > 0 ? (
                        <div className="bg-gray-100 p-1 rounded">
                          {lane.passengers_in_body_scanner_queue.map((passenger, idx) => (
                            <div key={`${passenger.id}-${idx}`} className="text-xs mb-1 border-b border-gray-100 last:border-b-0">
                              <PassengerLabel 
                                passenger={passenger} 
                                onClick={onSelectPassenger}
                                showDetails={false}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic">Queue empty</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Column 3: Scanners */}
              <div className="col-span-1 flex flex-col space-y-3">
                {/* Bag Scanner */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">Bag scanner</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="text-xs font-semibold mb-1">Scanner: {lane.bag_scanner.current_items.length}/{lane.bag_scanner.capacity}</div>
                    
                    <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                      {lane.bag_scanner.current_items.length > 0 ? (
                        <div className="bg-gray-100 p-1 rounded">
                          {lane.bag_scanner.current_items.map(bagId => {
                            const bag = gameState.bags.find(b => b.id === bagId);
                            return bag ? (
                              <div key={bagId} className="text-xs flex justify-between items-center mb-1 p-1 border-b border-gray-100 last:border-b-0">
                                <span className="truncate w-16">{bag.passenger_name.split(' ')[0]}</span>
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{width: `${Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%`}}
                                  ></div>
                                </div>
                                <span className="w-6 text-right">{Math.floor(lane.bag_scanner.current_scan_progress[bagId] || 0)}%</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic">No bags in scanner</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Body Scanner */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">Body scanner</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="text-xs font-semibold mb-1">Scanner: {lane.person_scanner.current_items.length}/{lane.person_scanner.capacity}</div>
                    
                    <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                      {lane.person_scanner.current_items.length > 0 ? (
                        <div className="bg-gray-100 p-1 rounded">
                          {lane.person_scanner.current_items.map(personId => {
                            const passenger = gameState.passengers.find(p => p.id === personId);
                            return passenger ? (
                              <div key={personId} className="text-xs flex justify-between items-center mb-1 p-1 border-b border-gray-100 last:border-b-0">
                                <span className="truncate w-16">{passenger.name.split(' ')[0]}</span>
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{width: `${Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%`}}
                                  ></div>
                                </div>
                                <span className="w-6 text-right">{Math.floor(lane.person_scanner.current_scan_progress[personId] || 0)}%</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic">No people in scanner</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Column 4: Placeholder and Waiting for Bags */}
              <div className="col-span-1 flex flex-col space-y-3">
                {/* Placeholder */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">PLACEHOLDER</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="text-gray-400 text-xs italic">Future functionality</div>
                  </div>
                </div>
                
                {/* Waiting for Bags */}
                <div className="border border-gray-200 rounded p-2 flex-1">
                  <h3 className="font-semibold text-sm mb-2">Waiting for bags</h3>
                  <div className="bg-gray-50 p-2 rounded h-[calc(100%-2rem)]">
                    <div className="overflow-y-auto h-full">
                      {lane.passengers_waiting_for_bags.length > 0 ? (
                        <div>
                          {lane.passengers_waiting_for_bags.map((passenger, idx) => (
                            <div key={`${passenger.id}-waiting-${idx}`} className="text-xs py-1 border-b border-gray-100 last:border-0">
                              <PassengerLabel 
                                passenger={passenger} 
                                onClick={onSelectPassenger}
                                showDetails={false}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic">No passengers waiting</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 