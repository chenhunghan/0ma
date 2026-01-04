import { useState } from "react";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { StopInstanceDialog } from "./StopInstanceDialog";
import { StoppingInstanceDialog } from "./StoppingInstanceDialog";
import { useLimaInstance } from "src/hooks/useLimaInstance";
import { StopCircleIcon, PlayIcon } from "lucide-react";
import { Button } from "./ui/button";
import { InstanceStatus } from "src/types/InstanceStatus";
import { StartInstanceDialog } from "./StartInstanceDialog";
import { StartingInstanceDialog } from "./StartingInstanceDialog";

export function StopInstanceDialogs() {
    const { selectedInstance, selectedName, isLoading } = useSelectedInstance();
    const { stopInstance, startInstance } = useLimaInstance();

    const [stopInstanceDialogOpen, setStopInstanceDialogOpen] = useState(false);
    const [stoppingInstanceDialogOpen, setStoppingInstanceDialogOpen] = useState(false);

    const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
    const [startingInstanceDialogOpen, setStartingInstanceDialogOpen] = useState(false);

    const handleStopClick = () => {
        setStopInstanceDialogOpen(true);
    };

    const handleConfirmStop = () => {
        if (!selectedName) return;
        stopInstance(selectedName);
        setStoppingInstanceDialogOpen(true);
    };

    const handleStartClick = () => {
        setStartInstanceDialogOpen(true);
    };

    const handleConfirmStart = () => {
        if (!selectedName) return;
        startInstance(selectedName);
        setStartingInstanceDialogOpen(true);
    };

    const isRunning = selectedInstance?.status === InstanceStatus.Running;
    const isStopped = selectedInstance?.status === InstanceStatus.Stopped;

    return (
        <>
            {isStopped ? (
                <Button
                    variant="outline"
                    aria-label="Start Lima instance"
                    disabled={isLoading}
                    onClick={handleStartClick}
                >
                    <PlayIcon className="md:hidden" />
                    <span className="hidden md:inline">Start</span>
                </Button>
            ) : (
                <Button
                    variant="secondary"
                    aria-label="Stop Lima instance"
                    disabled={!isRunning || isLoading}
                    onClick={handleStopClick}
                >
                    <StopCircleIcon className="md:hidden" />
                    <span className="hidden md:inline">Stop</span>
                </Button>
            )}

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

            <StartInstanceDialog
                open={startInstanceDialogOpen}
                onOpenChange={setStartInstanceDialogOpen}
                onStart={handleConfirmStart}
                instanceName={selectedName}
                variant="stopped"
            />
            <StartingInstanceDialog
                open={startingInstanceDialogOpen}
                onDialogOpenChange={setStartingInstanceDialogOpen}
                instanceName={selectedName}
                onSuccess={() => {
                    setStartingInstanceDialogOpen(false);
                }}
            />
        </>
    );
}
