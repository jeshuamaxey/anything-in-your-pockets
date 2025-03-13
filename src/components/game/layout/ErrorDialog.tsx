import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react";
import { GameState } from "@/types/gameTypes";

const ErrorDialog = ({
  errorDialogOpen,
  setErrorDialogOpen,
  gameState,
  setGameState
}: {
  errorDialogOpen: boolean;
  setErrorDialogOpen: (open: boolean) => void;
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
}) => {
  return (
    <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="relative"
              onClick={() => setErrorDialogOpen(true)}
            >
              <AlertCircle className="h-4 w-4" />
              {gameState.errors.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {gameState.errors.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>System Errors</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {gameState.errors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No errors to display</p>
              ) : (
                <div className="space-y-2">
                  {gameState.errors.map((error, index) => (
                    <div key={index} className="bg-destructive/10 border border-destructive/20 rounded p-2">
                      <p className="text-sm text-destructive">{error.message}</p>
                      <p className="text-xs text-destructive/70 mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  <Button variant="destructive" onClick={() => setGameState({...gameState, errors: []})}>
                    Clear Errors
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
  );
};

export default ErrorDialog;