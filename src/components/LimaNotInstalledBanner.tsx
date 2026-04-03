import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "src/components/ui/button";
import { Spinner } from "src/components/ui/spinner";
import { AlertTriangle, Download } from "lucide-react";

export function LimaNotInstalledBanner() {
  const queryClient = useQueryClient();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      await invoke<string>("install_lima_cmd");
      await queryClient.invalidateQueries({ queryKey: ["lima_installed"] });
      await queryClient.invalidateQueries({ queryKey: ["instances"] });
    } catch (err) {
      setInstallError(String(err));
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full items-center justify-center gap-4 px-6 animate-in fade-in duration-500">
      <div className="p-4 rounded-full bg-muted/30">
        <AlertTriangle className="size-8 text-muted-foreground/40" />
      </div>
      <div className="text-center max-w-[280px] space-y-2">
        <p className="text-sm text-muted-foreground">
          Lima is not installed. 0ma requires Lima to create and manage virtual machines.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-4 text-[10px] gap-2"
          onClick={handleInstall}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <>
              <Spinner />
              Installing...
            </>
          ) : (
            <>
              <Download className="size-3" />
              Install Lima via Homebrew
            </>
          )}
        </Button>

        <code className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded">
          brew install lima
        </code>
      </div>

      {installError && (
        <p className="text-xs text-destructive max-w-[280px]">{installError}</p>
      )}
    </div>
  );
}
