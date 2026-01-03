import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { PlayIcon } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: () => void;
}

export function StartInstanceDialog({ open, onOpenChange, onStart }: Props) {
    const { instanceName } = useCreateLimaInstanceDraft();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Instance Created</DialogTitle>
                    <DialogDescription>
                        Lima instance <strong>{instanceName}</strong> has been created successfully.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <p className="text-sm text-muted-foreground">
                        Do you want to start it now?
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
                        <PlayIcon className="mr-2 h-4 w-4" />
                        Start Instance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
