import { useState } from "react";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { StopInstanceDialog } from "./StopInstanceDialog";
import { StoppingInstanceDialog } from "./StoppingInstanceDialog";
import { useLimaInstance } from "src/hooks/useLimaInstance";
import { StopCircleIcon } from "lucide-react";
import { Button } from "./ui/button";
import { InstanceStatus } from "src/types/InstanceStatus";

export function StopInstanceDialogs() {
    const { selectedInstance, selectedName, isLoading } = useSelectedInstance();
    const { stopInstance } = useLimaInstance();

    const [stopInstanceDialogOpen, setStopInstanceDialogOpen] = useState(false);
    const [stoppingInstanceDialogOpen, setStoppingInstanceDialogOpen] = useState(false);

    const handleStopClick = () => {
        setStopInstanceDialogOpen(true);
    };

    const handleConfirmStop = () => {
        if (!selectedName) return;
        stopInstance(selectedName);
        setStoppingInstanceDialogOpen(true);
    };

    const disabled =
        selectedInstance?.status !== InstanceStatus.Running ||
        isLoading;

    return (
        <>
            <Button
                variant="secondary"
                aria-label="Stop Lima instance"
                disabled={disabled}
                onClick={handleStopClick}
            >
                <StopCircleIcon className="md:hidden" />
                <span className="hidden md:inline">Stop</span>
            </Button>

            <StopInstanceDialog
                open={stopInstanceDialogOpen}
                onOpenChange={setStopInstanceDialogOpen}
                instanceName={selectedName}
                onConfirm={handleConfirmStop}
            />
            <StoppingInstanceDialog
                open={stoppingInstanceDialogOpen}
                onDialogOpenChange={setStoppingInstanceDialogOpen}
                instanceName={selectedName}
                onSuccess={() => {
                    setStoppingInstanceDialogOpen(false);
                }}
            />
        </>
    );
}
