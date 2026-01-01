import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";


export function CreatingInstance({ className }: { className?: string }) {
    return (
        <Dialog>
            <DialogTrigger>
                <Button variant="default" size="icon" aria-label="Create new Lima instance" className={className}>
                    <PlusIcon />
                </Button>
            </DialogTrigger>
            <CreatingInstanceDialogContent>
                null
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
                <Button variant="outline">Cancel</Button>
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