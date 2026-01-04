import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { PlayIcon } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: () => void;
    instanceName: string | null;
    variant?: "created" | "stopped";
}

export function StartInstanceDialog({ open, onOpenChange, onStart, instanceName, variant = "created" }: Props) {
    if (!instanceName) return null;

    const isCreated = variant === "created";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isCreated ? "Instance Created" : "Start Instance"}</DialogTitle>
                    <DialogDescription>
                        {isCreated
                            ? <>Lima instance <strong>{instanceName}</strong> has been created successfully.</>
                            : <>Are you sure you want to start instance <strong>{instanceName}</strong>?</>
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <p className="text-xs text-muted-foreground">
                        {isCreated ? "Do you want to start it now?" : "It will take a few moments to boot up."}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={() => {
                        onStart();
                        onOpenChange(false);
                    }}>
                        Start
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
