import { HISTOGRAM_INTERVAL } from "@/lib/game-constants";
import { GameState } from "@/types/gameTypes";

// Helper function to render the histogram
export const Histogram = (gameState: GameState) => {
  // Get the histogram data from the game state
  const { histogram_data } = gameState;
  
  // Convert the histogram data to an array of [time, count] pairs and sort by time
  const histogramEntries = Object.entries(histogram_data)
    .map(([time, count]) => [parseInt(time), count])
    .sort((a, b) => (b[0] as number) - (a[0] as number)); // Sort in descending order (newest first)
  
  // If there's no data, show a message
  if (histogramEntries.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4 h-full flex items-center justify-center">
        <p>No passenger data available yet. Process passengers to see the histogram.</p>
      </div>
    );
  }
  
  // Find the maximum count for scaling
  const maxCount = Math.max(...histogramEntries.map(entry => entry[1] as number));
  
  // Calculate the bar height based on the maximum count
  const getBarHeight = (count: number) => {
    return Math.max(10, (count / maxCount) * 200); // Min height of 10px, max height of 200px
  };
  
  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex flex-col">
        <div className="text-xs text-slate-50 font-mono p-1">Processing rate (passengers / {HISTOGRAM_INTERVAL}s)</div>
      </div>
      <div className="flex items-end h-[250px] relative flex-grow">        
        {/* Bars */}
        <div className="flex items-end pl-8 w-full h-full gap-1 overflow-x-auto pb-6">
          {histogramEntries.map(([, count], index) => (
            <div key={index} className="flex flex-col items-center flex-shrink-0">
              <div 
                className={`w-4 ${index === 0 ? 'bg-green-500/50' : 'bg-green-500'}`}
                style={{ height: `${getBarHeight(count as number)}px` }}
              >
                <div className="text-white text-xs text-center font-bold">
                  {count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};