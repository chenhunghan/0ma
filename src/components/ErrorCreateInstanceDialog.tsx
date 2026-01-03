import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Log } from "src/types/Log";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    errors: Log[];
    onRetry: () => void;
    onClose: () => void;
}

export function ErrorCreateInstanceDialog({ open, onOpenChange, errors, onRetry, onClose }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-destructive">Creation Failed</DialogTitle>
                    <DialogDescription>
                        An error occurred while creating the instance.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted p-4 text-sm font-mono text-destructive-foreground">
                    {errors.length === 0 ? (
                        <p>Unknown error occurred.</p>
                    ) : (
                        errors.map((log) => (
                            <div key={log.id} className="mb-2 last:mb-0">
                                <span className="text-xs opacity-70 block mb-0.5">{log.timestamp}</span>
                                {log.message}
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <DialogClose render={
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    } />

                    <Button variant="default" onClick={onRetry}>Retry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
