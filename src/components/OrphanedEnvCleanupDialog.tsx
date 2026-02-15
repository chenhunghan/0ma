import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useOrphanedEnvCleanup } from "src/hooks/useOrphanedEnvCleanup";

export function OrphanedEnvCleanupDialog() {
  const {
    orphanedNames,
    dialogOpen,
    handleCleanup,
    handleDismiss,
    isCleaning,
    cleanupError,
  } = useOrphanedEnvCleanup();

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shell Config Cleanup</DialogTitle>
          <DialogDescription>
            Found leftover environment entries in your shell config from deleted
            instances. Would you like to clean them up?
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-xs text-muted-foreground">Orphaned instances:</p>
          <ul className="list-disc pl-5 text-sm">
            {orphanedNames.map((name) => (
              <li key={name}>
                <code className="text-xs">{name}</code>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            This will remove the <code>source</code> lines and{" "}
            <code>~/.kube</code> symlinks for these instances.
          </p>
          {cleanupError && (
            <p className="text-xs text-destructive">
              Error: {cleanupError.message}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss} disabled={isCleaning}>
            Ignore
          </Button>
          <Button onClick={handleCleanup} disabled={isCleaning}>
            {isCleaning ? "Cleaning up..." : "Clean Up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
