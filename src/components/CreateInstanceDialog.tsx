
import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { CreateInstanceConfigForm } from "./CreateInstanceConfigForm";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { useLimaInstance } from "src/hooks/useLimaInstance";
import { useState } from "react";

interface Props {
    className?: string;
    open?: boolean;
    onDialogOpenChange: (open: boolean) => void;
    onCreateInstanceSuccess?: () => void;
}

export function CreateInstanceDialog({ className, open, onDialogOpenChange, onCreateInstanceSuccess }: Props) {
    return (
        <Dialog open={open} onOpenChange={onDialogOpenChange}>
            <DialogTrigger render={
                <Button variant="default" size="icon" aria-label="Create new Lima instance" className={className}>
                    <PlusIcon />
                </Button>
            } />
            <CreateInstanceDialogContent onCreateInstanceSuccess={onCreateInstanceSuccess}>
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

function CreateInstanceDialogFooter({ onCreateInstanceSuccess }: { onCreateInstanceSuccess?: () => void }) {

    const { draftConfig, instanceName } = useCreateLimaInstanceDraft();
    const { createInstance } = useLimaInstance();
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = () => {
        if (!draftConfig || !instanceName) return;

        setIsCreating(true);
        createInstance({ config: draftConfig, instanceName }, {
            onSuccess: () => {
                console.log(`Starting creation of instance ${instanceName} `);
                setIsCreating(false);
                if (onCreateInstanceSuccess) {
                    onCreateInstanceSuccess();
                }
            },
            onError: (error) => {
                console.error(`Failed to create instance: ${error.message} `);
                setIsCreating(false);
            }
        });
    };

    return (
        <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            {/* We might want to close on success, but for now we'll just fire the event */}
            <DialogClose render={
                <Button variant="default" onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                </Button>
            } />
        </DialogFooter>
    )
}

function CreateInstanceDialogContent({ children, onCreateInstanceSuccess }: { children: React.ReactNode, onCreateInstanceSuccess?: () => void }) {
    return (
        <DialogContent className="sm:max-w-2xl">
            <CreateInstanceDialogHeader />
            {children}
            <CreateInstanceDialogFooter onCreateInstanceSuccess={onCreateInstanceSuccess} />
        </DialogContent>
    )
}