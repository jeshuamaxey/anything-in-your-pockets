"use client"

import { calculateDuration } from "@/lib/game-utils";
import JourneyBarChart from "../security/JourneyBarChart";
import { formatDuration } from "@/lib/game-utils";
import { Passenger } from "@/types/gameTypes";
import useDebug from "@/hooks/useDebug";

const PassengerInfo = ({ passenger }: { passenger: Passenger }) => {
  const debug = useDebug()

  return (
    <>
      {/* Debug Info */}
      {
        debug && (
          <pre className="text-xs mb-1 bg-gray-100 p-2 rounded">
            {JSON.stringify(passenger.bag, null, 2)}
          </pre>
        )
      }
      {/* Passenger Info */}
      <div className="mb-2">
            <div className="text-xs mb-1"><span className="font-medium">Nationality:</span> {passenger.nationality.emoji}</div>
            <div className="text-xs mb-1"><span className="font-medium">Security Familiarity:</span> {passenger.security_familiarity}/10</div>
            <div className="text-xs mb-1"><span className="font-medium">Has Bag:</span> {passenger.has_bag ? 'Yes' : 'No'}</div>
      </div>
      
      {/* Journey Bar Chart */}
      <div className="mb-3">
        <JourneyBarChart passenger={passenger} />
      </div>
      
      {/* Detailed Timeline */}
      <div className="space-y-1 text-xs">
        <div className="grid grid-cols-2 gap-1 p-1 bg-blue-50 rounded">
          <div><span className="font-medium">Main Queue Wait:</span></div>
          <div>{formatDuration(calculateDuration(passenger.spawned_timestamp, passenger.security_lane_queue_assigned_timestamp))}</div>
        </div>
        
        {passenger.has_bag && (
          <>
            <div className="grid grid-cols-2 gap-1 p-1 bg-green-50 rounded">
              <div><span className="font-medium">Bag Unload:</span></div>
              <div>{formatDuration(calculateDuration(passenger.bag_unload_started_timestamp, passenger.bag_unload_completed_timestamp))}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-1 p-1 bg-yellow-50 rounded">
              <div><span className="font-medium">Bag Scan:</span></div>
              <div>{formatDuration(calculateDuration(passenger.bag_scanner_started_timestamp, passenger.bag_scanner_complete_timestamp))}</div>
            </div>
          </>
        )}
        
        <div className="grid grid-cols-2 gap-1 p-1 bg-purple-50 rounded">
          <div><span className="font-medium">Body Scanner Queue:</span></div>
          <div>{formatDuration(calculateDuration(passenger.body_scanner_queue_joined_timestamp, passenger.body_scanner_started_timestamp))}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-1 p-1 bg-red-50 rounded">
          <div><span className="font-medium">Body Scan:</span></div>
          <div>{formatDuration(calculateDuration(passenger.body_scanner_started_timestamp, passenger.body_scanner_finished_timestamp))}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-1 p-1 bg-orange-50 rounded">
          <div><span className="font-medium">Waiting for Bag:</span></div>
          <div>{formatDuration(calculateDuration(passenger.waiting_for_bag_started_timestamp, passenger.waiting_for_bag_finished_timestamp))}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded mt-2">
          <div><span className="font-medium">Total Time:</span></div>
          <div>{formatDuration(calculateDuration(passenger.spawned_timestamp, passenger.security_cleared_timestamp))}</div>
        </div>
      </div>
    </>
  )
}

export default PassengerInfo;