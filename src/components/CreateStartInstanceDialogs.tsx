import { useLimaInstance } from "src/hooks/useLimaInstance";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { CreateInstanceDialog } from "./CreateInstanceDialog";
import { CreatingInstanceDialog } from "./CreatingInstanceDialog";
import { ErrorCreateInstanceDialog } from "./ErrorCreateInstanceDialog";
import { StartInstanceDialog } from "./StartInstanceDialog";
import { StartingInstanceDialog } from "./StartingInstanceDialog";
import { useState } from "react";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";

export function CreateStartInstanceDialogs() {
    const [createInstanceDialogOpen, setCreateInstanceDialogOpen] = useState(false);
    const [creatingInstanceDialogOpen, setCreatingInstanceDialogOpen] = useState(false);
    const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
    const [startingInstanceDialogOpen, setStartingInstanceDialogOpen] = useState(false);

    const { createInstance, startInstance } = useLimaInstance();
    const { setActiveTab } = useLayoutStorage();
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
            setStartInstanceDialogOpen(false);
            setStartingInstanceDialogOpen(true);
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
            <StartingInstanceDialog
                open={startingInstanceDialogOpen}
                onDialogOpenChange={setStartingInstanceDialogOpen}
                onSuccess={() => {
                    setStartingInstanceDialogOpen(false);
                    setActiveTab("lima");
                }}
            />
        </>
    )
}
