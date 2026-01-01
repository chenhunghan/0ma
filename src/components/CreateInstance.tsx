import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { CreateInstanceConfigForm } from "./CreateInstanceConfigForm";

export function CreateInstance({ className }: { className?: string }) {
    return (
        <Dialog>
            <DialogTrigger>
                <Button variant="default" size="icon" aria-label="Create new Lima instance" className={className}>
                    <PlusIcon />
                </Button>
            </DialogTrigger>
            <CreateInstanceDialogContent>
                <CreateInstanceConfigForm />
            </CreateInstanceDialogContent>
        </Dialog>
    )
}

function CreateInstanceDialogHeader() {
    return (
        <DialogHeader>
            <DialogTitle>Create Instance</DialogTitle>
            <DialogDescription>Create a new Lima instance</DialogDescription>
        </DialogHeader>
    )
}

function CreateInstanceDialogFooter() {
    return (
        <DialogFooter>
            <DialogClose>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="default">Create</Button>
        </DialogFooter>
    )
}

function CreateInstanceDialogContent({ children }: { children: React.ReactNode }) {
    return (
        <DialogContent className="sm:max-w-2xl">
            <CreateInstanceDialogHeader />
            {children}
            <CreateInstanceDialogFooter />
        </DialogContent>
    )
}