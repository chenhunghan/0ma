import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";

interface Props {
  open: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onCreateInstanceSuccess?: () => void;
}

export function CreatingInstanceDialog({
  open,
  onDialogOpenChange,
  onCreateInstanceSuccess,
}: Props) {
  const { instanceName } = useCreateLimaInstanceDraft();
  const logState = useOnLimaCreateLogs(instanceName, {
    onSuccess: () => {
      onCreateInstanceSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <CreatingInstanceDialogContent onClose={() => onDialogOpenChange(false)}>
        <LogViewer logState={logState} />
      </CreatingInstanceDialogContent>
    </Dialog>
  );
}

function CreatingInstanceDialogContent({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Creating Instance</DialogTitle>
        <DialogDescription>Creating a new Lima instance</DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter>
        <Button
          variant="outline"
          title="Close the instance will not cancel the creation process"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
