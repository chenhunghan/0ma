import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";

interface Props {
    open: boolean;
    onDialogOpenChange: (open: boolean) => void;
    onCreateInstanceSuccess?: () => void;
}

export function CreatingInstanceDialog({ open, onDialogOpenChange, onCreateInstanceSuccess }: Props) {
    const { instanceName } = useCreateLimaInstanceDraft();
    const logState = useOnLimaCreateLogs(instanceName, {
        onSuccess: () => {
            onCreateInstanceSuccess?.();
        }
    });

    return (
        <Dialog open={open} onOpenChange={onDialogOpenChange}>
            <CreatingInstanceDialogContent>
                <LogViewer logState={logState} />
            </CreatingInstanceDialogContent>
        </Dialog>
    )
}

function CreatingInstanceDialogContent({ children }: { children: React.ReactNode }) {
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Creating Instance</DialogTitle>
                <DialogDescription>Creating a new Lima instance</DialogDescription>
            </DialogHeader>
            {children}
            <DialogFooter>
                <DialogClose>
                    <Button variant="outline" title="Close the instance will not cancel the creation process">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}