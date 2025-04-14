type CapacityIndicatorBarProps = {
  queueLength: number;
  capacity: number;
}

const CapacityIndicatorBar = ({queueLength, capacity}: CapacityIndicatorBarProps) => {
  return (
    <div 
      className={`h-2.5 rounded-full ${
        (queueLength / capacity) * 100 < 50 ? 'bg-green-500' : 
        (queueLength / capacity) * 100 < 70 ? 'bg-yellow-500' : 
        (queueLength / capacity) * 100 < 90 ? 'bg-orange-500' : 
        'bg-red-500'
      }`}
      style={{ width: `${Math.min((queueLength / capacity) * 100, 100)}%` }}
      >
    </div>
  )
}

export default CapacityIndicatorBar;