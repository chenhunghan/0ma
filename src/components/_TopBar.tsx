import { TrashIcon, StopCircleIcon } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "src/components/ui/select"
import { Button } from "src/components/ui/button"
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { Spinner } from "./ui/spinner";
import { LimaInstance } from "src/types/LimaInstance";
import { useLimaInstances } from "src/hooks/useLimaInstances";
import { useLimaInstance } from "src/hooks/useLimaInstance";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { CreateInstanceDialog } from "./CreateInstanceDialog";
import { CreatingInstanceDialog } from "./CreatingInstanceDialog";
import { ErrorCreateInstanceDialog } from "./ErrorCreateInstanceDialog";
import { StartInstanceDialog } from "./StartInstanceDialog";
import { useState } from "react";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";


export function TopBar() {
    return (
        <div className="w-full px-[8px] py-[6px] flex items-center">
            {/* Left side */}
            <div className="flex items-center flex-1">
                <InstanceSelector />
                <Dialogs />
            </div>

            {/* Middle side - hidden on mobile */}
            <InstanceName className="text-xs hidden md:block" />

            {/* Right side */}
            <div className="flex items-center justify-end flex-1">
                <StopInstanceButton />
                <DeleteInstanceButton className="ml-[6px]" />
            </div>
        </div>
    )
}


function Dialogs() {
    const [createInstanceDialogOpen, setCreateInstanceDialogOpen] = useState(false);
    const [creatingInstanceDialogOpen, setCreatingInstanceDialogOpen] = useState(false);
    const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);

    const { createInstance, startInstance } = useLimaInstance();
    const { draftConfig, instanceName } = useCreateLimaInstanceDraft();
    const { reset: resetCreateLogs } = useOnLimaCreateLogs(instanceName);

    const handleCreateInstance = () => {
        if (!draftConfig || !instanceName) return;

        setCreatingInstanceDialogOpen(true);
        createInstance({ config: draftConfig, instanceName });
    };

    const handleRetry = () => {
        resetCreateLogs();
        setCreateInstanceDialogOpen(true);
    };

    const handleCloseError = () => {
        resetCreateLogs();
    };

    const handleStartInstance = () => {
        if (instanceName) {
            startInstance(instanceName);
        }
    };

    return (
        <>
            <CreateInstanceDialog
                buttonClassName="ml-[6px]"
                open={createInstanceDialogOpen}
                onDialogOpenChange={setCreateInstanceDialogOpen}
                onClickCreate={handleCreateInstance}
            />
            <CreatingInstanceDialog
                open={creatingInstanceDialogOpen}
                onDialogOpenChange={setCreatingInstanceDialogOpen}
                onCreateInstanceSuccess={() => {
                    setCreatingInstanceDialogOpen(false);
                    setStartInstanceDialogOpen(true);
                }}
            />
            <ErrorCreateInstanceDialog
                onRetry={handleRetry}
                onClose={handleCloseError}
            />
            <StartInstanceDialog
                open={startInstanceDialogOpen}
                onOpenChange={setStartInstanceDialogOpen}
                onStart={handleStartInstance}
            />
        </>
    )
}


export function InstanceSelector() {
    const { instances, isLoading: isLoadingInstances } = useLimaInstances();
    const { selectedName, isLoading, setSelectedName } = useSelectedInstance();

    return (
        <Select
            value={selectedName ?? ""}
            onValueChange={setSelectedName}
            disabled={isLoading || isLoadingInstances}
        >
            <SelectTrigger className="w-[180px]">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Spinner />
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <SelectValue placeholder="Select a Lima instance" />
                )}
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {instances.map((instance: LimaInstance) => (
                        <SelectItem key={instance.name} value={instance.name}>
                            {instance.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}

export function StopInstanceButton() {
    return (
        <Button
            variant="secondary"
            aria-label="Stop Lima instance"
        >
            <StopCircleIcon className="md:hidden" />
            <span className="hidden md:inline">Stop</span>
        </Button>
    )
}

export function DeleteInstanceButton({ className }: { className?: string }) {
    return (
        <Button variant="destructive" size="icon" aria-label="Delete Lima instance" className={className}>
            <TrashIcon />
        </Button>
    )
}

export function InstanceName({ className }: { className?: string }) {
    const { selectedName, isLoading } = useSelectedInstance();
    if (isLoading) {
        return (
            <span className={className} title="Loading Lima instances"><Spinner /></span>
        )
    }
    return (
        <span className={className} title={`Selected Lima instance: ${selectedName}`}>{selectedName}</span>
    )
}
