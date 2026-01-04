import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaStartLogs } from "src/hooks/useOnLimaStartLogs";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onDialogOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function StartingInstanceDialog({ open, onDialogOpenChange, onSuccess }: Props) {
    const { instanceName } = useCreateLimaInstanceDraft();
    const logState = useOnLimaStartLogs(instanceName);

    useEffect(() => {
        if (logState.isSuccess) {
            onSuccess?.();
            onDialogOpenChange(false);
        }
    }, [logState.isSuccess, onSuccess, onDialogOpenChange]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // User manually closed the dialog
            onDialogOpenChange(false);
            // We treat manual close as "done watching" - triggers navigation to Lima tab in parent
            onSuccess?.();
        } else {
            onDialogOpenChange(true);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <StartingInstanceDialogContent isReady={logState.isReady} isSuccess={logState.isSuccess} isError={logState.error.length > 0}>
                <LogViewer logState={logState} />
            </StartingInstanceDialogContent>
        </Dialog>
    )
}

function StartingInstanceDialogContent({ children, isReady, isSuccess, isError }: { children: React.ReactNode, isReady?: boolean, isSuccess?: boolean, isError?: boolean }) {
    const canClose = isReady || isSuccess || isError;

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {!isSuccess && !isError && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSuccess ? "Instance Started" : "Starting Instance..."}
                </DialogTitle>
                <DialogDescription>
                    {isSuccess ? "The instance has started successfully." : (isReady ? "The instance is ready, you can close the dialog" : "Please wait while the instance starts.")}
                </DialogDescription>
            </DialogHeader>
            {children}
            <DialogFooter>
                {canClose ? (
                    <DialogClose>
                        <Button variant="default" title={isSuccess ? "Close the dialog" : "The instance is ready, you can close the dialog"}>
                            {isSuccess ? "Done" : "Close"}
                        </Button>
                    </DialogClose>
                ) : (
                    <Button variant="outline" disabled title="Please wait for the instance to be ready">
                        Close
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    )
}
