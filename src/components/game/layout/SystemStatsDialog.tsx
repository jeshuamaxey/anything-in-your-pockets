import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GameState } from "@/types/gameTypes";
import { ChartColumn } from "lucide-react";
import SystemStatus from "@/components/game/common/SystemStatus";

const SystemStatsDialog = ({
  systemStatsOpen,
  setSystemStatsOpen,
  gameState,
  setGameState
}: {
  systemStatsOpen: boolean;
  setSystemStatsOpen: (open: boolean) => void;
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
}) => {

  return (
    <Dialog open={systemStatsOpen} onOpenChange={setSystemStatsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0"
          title="System Stats"
        >
          <ChartColumn className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>System Stats</DialogTitle>
          <DialogDescription>
            System stats
          </DialogDescription>
        </DialogHeader>
        <SystemStatus gameState={gameState} setGameState={setGameState} />
      </DialogContent>
    </Dialog>
  );  
}

export default SystemStatsDialog;
