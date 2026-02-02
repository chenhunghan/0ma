import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";

interface Props {
  onRetry: () => void;
  onClose: () => void;
}

export function ErrorCreateInstanceDialog({ onRetry, onClose }: Props) {
  const { instanceName } = useCreateLimaInstanceDraft();
  const { isSuccess: isSuccessCreatingInstance, error: errorCreatingInstance } =
    useOnLimaCreateLogs(instanceName);
  const isCreatingInstanceFailed = errorCreatingInstance.length > 0 && !isSuccessCreatingInstance;
  return (
    <Dialog open={isCreatingInstanceFailed} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Creation Failed</DialogTitle>
          <DialogDescription>An error occurred while creating the instance.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted p-4 text-sm font-mono text-destructive-foreground">
          {errorCreatingInstance.length === 0 ? (
            <p>Unknown error occurred.</p>
          ) : (
            errorCreatingInstance.map((log) => (
              <div key={log.id} className="mb-2 last:mb-0">
                <span className="text-xs opacity-70 block mb-0.5">{log.timestamp}</span>
                {log.message}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            }
          />

          <Button variant="default" onClick={onRetry}>
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
