import { useCallback } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string | null;
  envShPath: string;
  onAddToProfile: () => void;
  onClose: () => void;
  profileMessage: string | null;
  profileError: Error | null;
  isAddingToProfile: boolean;
}

export function EnvSetupDialog({
  open,
  onOpenChange,
  instanceName,
  envShPath,
  onAddToProfile,
  onClose,
  profileMessage,
  profileError,
  isAddingToProfile,
}: Props) {
  const sourceCommand = `source "${envShPath}"`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sourceCommand);
  }, [sourceCommand]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Environment Setup</DialogTitle>
          <DialogDescription>
            Instance <strong>{instanceName}</strong> is running. Configure your
            shell to use kubectl and docker against it.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Run this in your terminal:
          </p>
          <code className="block rounded bg-muted px-3 py-2 text-xs break-all select-all">
            {sourceCommand}
          </code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddToProfile}
              disabled={isAddingToProfile}
            >
              Add to Shell Profile
            </Button>
          </div>
          {profileMessage && (
            <p className="text-xs text-muted-foreground">{profileMessage}</p>
          )}
          {profileError && (
            <p className="text-xs text-destructive">
              Error: {profileError.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
