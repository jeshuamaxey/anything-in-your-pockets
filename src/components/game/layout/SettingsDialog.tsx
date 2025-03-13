import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toggleSoundFX } from "@/lib/audio-utils";
import { isAmbientSoundEnabled } from "@/lib/audio-utils";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { isSoundFXEnabled } from "@/lib/audio-utils";
import { toggleAmbientSound } from "@/lib/audio-utils";

const SettingsDialog = ({
  settingsOpen,
  setSettingsOpen,
}: {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}) => {
  const [soundFXOn, setSoundFXOn] = useState(isSoundFXEnabled());
  const [ambientOn, setAmbientOn] = useState(isAmbientSoundEnabled());

  const handleSoundFXToggle = () => {
    const isEnabled = toggleSoundFX();
    setSoundFXOn(isEnabled);
  };

  const handleAmbientToggle = () => {
    const isEnabled = toggleAmbientSound();
    setAmbientOn(isEnabled);
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Game Settings</DialogTitle>
              <DialogDescription>
                Configure your game experience
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Sound</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure game audio settings
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="sound-fx" className="flex flex-col gap-1">
                      <span>Sound Effects</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Beeps and interaction sounds
                      </span>
                    </Label>
                    <Switch
                      id="sound-fx"
                      checked={soundFXOn}
                      onCheckedChange={handleSoundFXToggle}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="ambient" className="flex flex-col gap-1">
                      <span>Ambient Sound</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Background airport noise
                      </span>
                    </Label>
                    <Switch
                      id="ambient"
                      checked={ambientOn}
                      onCheckedChange={handleAmbientToggle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
  );  
}

export default SettingsDialog;
