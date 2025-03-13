import { formatDuration } from "@/lib/game-utils";

const StatCard = ({ title, value, percentage, pc_dp = 0, duration = false }: { title: string, value: number, percentage?: boolean, pc_dp?: number, duration?: boolean }) => {
  return (
    <div className="flex flex-col items-start bg-foreground/50 p-2 rounded-md">
      {duration ?
        <p className="text-4xl font-mono font-bold">{formatDuration(value)}</p> :
        <p className="text-4xl font-mono font-bold">{percentage ? `${(value * 100).toFixed(pc_dp)}%` : value}</p>
      }
      <p className="text-xs font-mono">{title}</p>
    </div>
  )
}

export default StatCard;