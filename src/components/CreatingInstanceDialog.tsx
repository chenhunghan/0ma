import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";

interface Props {
    className?: string;
    open: boolean;
    onDialogOpenChange: (open: boolean) => void;
}

export function CreatingInstanceDialog({ className: _className, open, onDialogOpenChange }: Props) {
    const { instanceName } = useCreateLimaInstanceDraft();
    // Ensure we don't pass undefined/null to the hook if instanceName is empty (though the hook handles strings)
    const logState = useOnLimaCreateLogs(instanceName || "");

    return (
        <Dialog open={open} onOpenChange={onDialogOpenChange}>


            <CreatingInstanceDialogContent>
                <LogViewer logState={logState} />
            </CreatingInstanceDialogContent>
        </Dialog>
    )
}

function CreatingInstanceDialogHeader() {
    return (
        <DialogHeader>
            <DialogTitle>Creating Instance</DialogTitle>
            <DialogDescription>Creating a new Lima instance</DialogDescription>
        </DialogHeader>
    )
}

function CreatingInstanceDialogFooter() {
    return (
        <DialogFooter>
            <DialogClose>
                <Button variant="outline" title="Close the instance will not cancel the creation process">Close</Button>
            </DialogClose>
        </DialogFooter>
    )
}

function CreatingInstanceDialogContent({ children }: { children: React.ReactNode }) {
    return (
        <DialogContent className="sm:max-w-2xl">
            <CreatingInstanceDialogHeader />
            {children}
            <CreatingInstanceDialogFooter />
        </DialogContent>
    )
}