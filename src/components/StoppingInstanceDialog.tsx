import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaStopLogs } from "src/hooks/useOnLimaStopLogs";
import { Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onDialogOpenChange: (open: boolean) => void;
    instanceName: string | null;
    onSuccess?: () => void;
}

export function StoppingInstanceDialog({ open, onDialogOpenChange, instanceName, onSuccess }: Props) {
    const logState = useOnLimaStopLogs(instanceName || "");


    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onDialogOpenChange(false);
            if (logState.isSuccess) {
                onSuccess?.();
            }
        } else {
            onDialogOpenChange(true);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {!logState.isSuccess && !logState.error.length && <Loader2 className="h-4 w-4 animate-spin" />}
                        {logState.isSuccess ? "Instance Stopped" : "Stopping Instance..."}
                    </DialogTitle>
                    <DialogDescription>
                        {logState.isSuccess ? "The instance has been stopped successfully." : "Please wait while the instance stops."}
                    </DialogDescription>
                </DialogHeader>
                <LogViewer logState={logState} />
                <DialogFooter>
                    <Button
                        variant={logState.isSuccess ? "default" : "outline"}
                        onClick={() => onDialogOpenChange(false)}
                    >
                        {logState.isSuccess ? "Done" : "Close"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
