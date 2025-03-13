import { Passenger } from "@/types/gameTypes";

// Helper component for the journey stacked bar chart
const JourneyBarChart = ({ passenger }: { passenger: Passenger }) => {
  // Calculate durations for each phase
  const calculatePhaseDuration = (start?: number, end?: number) => {
    if (!start || !end) return 0;
    return (end - start) / 1000; // seconds
  };
  
  // Define the journey phases and their colors
  const phases = [
    { 
      name: 'Queue Wait', 
      duration: calculatePhaseDuration(passenger.spawned_timestamp, passenger.security_lane_queue_assigned_timestamp),
      color: 'bg-blue-300'
    },
    ...(passenger.has_bag ? [
      { 
        name: 'Bag Unload', 
        duration: calculatePhaseDuration(passenger.bag_unload_started_timestamp, passenger.bag_unload_completed_timestamp),
        color: 'bg-green-300'
      },
      { 
        name: 'Bag Scan', 
        duration: calculatePhaseDuration(passenger.bag_scanner_started_timestamp, passenger.bag_scanner_complete_timestamp),
        color: 'bg-yellow-300'
      }
    ] : []),
    { 
      name: 'Body Scan Queue', 
      duration: calculatePhaseDuration(passenger.body_scanner_queue_joined_timestamp, passenger.body_scanner_started_timestamp),
      color: 'bg-purple-300'
    },
    { 
      name: 'Body Scan', 
      duration: calculatePhaseDuration(passenger.body_scanner_started_timestamp, passenger.body_scanner_finished_timestamp),
      color: 'bg-red-300'
    },
    { 
      name: 'Waiting for Bag', 
      duration: calculatePhaseDuration(passenger.waiting_for_bag_started_timestamp, passenger.waiting_for_bag_finished_timestamp),
      color: 'bg-orange-300'
    }
  ].filter(phase => phase.duration > 0);
  
  // Calculate total journey time
  const totalTime = phases.reduce((sum, phase) => sum + phase.duration, 0);
  
  // If no journey data yet
  if (totalTime === 0) {
    return <div className="text-center py-4">No journey data available yet.</div>;
  }
  
  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-medium">Journey Time Breakdown</div>
      
      {/* Stacked bar chart */}
      <div className="h-4 w-full flex rounded-md overflow-hidden">
        {phases.map((phase, index) => {
          const widthPercent = (phase.duration / totalTime) * 100;
          return (
            <div 
              key={index}
              className={`${phase.color} relative group`}
              style={{ width: `${widthPercent}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap">
                {phase.name}: {phase.duration.toFixed(1)}s ({widthPercent.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phases.map((phase, index) => (
          <div key={index} className="flex items-center text-xs">
            <div className={`w-3 h-3 ${phase.color} mr-1 rounded-sm`}></div>
            <span>{phase.name}: {phase.duration.toFixed(1)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JourneyBarChart;
