import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { LogViewer } from "./LogViewer";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";


export function CreatingInstance({ className }: { className?: string }) {
    const logState = useOnLimaCreateLogs("")
    return (
        <Dialog>
            <DialogTrigger>
                <Button variant="default" size="icon" aria-label="Create new Lima instance" className={className}>
                    <PlusIcon />
                </Button>
            </DialogTrigger>
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
            <Button variant="default">Create</Button>
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