import { useLimaInstance } from "src/hooks/useLimaInstance";
import { useLimaInstances } from "src/hooks/useLimaInstances";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { CreateInstanceDialog } from "./CreateInstanceDialog";
import { CreatingInstanceDialog } from "./CreatingInstanceDialog";
import { ErrorCreateInstanceDialog } from "./ErrorCreateInstanceDialog";
import { StartInstanceDialog } from "./StartInstanceDialog";
import { StartingInstanceDialog } from "./StartingInstanceDialog";
import { useCallback, useState } from "react";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";

// oxlint-disable-next-line max-statements
export function CreateStartInstanceDialogs({
  isDeletingDialogOpen,
  onEnvSetup,
}: {
  isDeletingDialogOpen?: boolean;
  onEnvSetup: (instanceName: string) => void;
}) {
  const [createDialogUserOpen, setCreateDialogUserOpen] = useState(false);
  const [creatingInstanceDialogOpen, setCreatingInstanceDialogOpen] = useState(false);
  const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
  const [startingInstanceDialogOpen, setStartingInstanceDialogOpen] = useState(false);

  const { createInstance, startInstance } = useLimaInstance();
  const { instances, isLoading: isLoadingInstances } = useLimaInstances();
  const { setActiveTab } = useLayoutStorage();
  const { draftConfig, instanceName, resetDraft } = useCreateLimaInstanceDraft();

  // Track the name of the instance being created/started so it survives resetDraft()
  // and the name-regeneration effect in useCreateLimaInstanceDraft.
  const [createdName, setCreatedName] = useState("");
  const { reset: resetCreateLogs } = useOnLimaCreateLogs(createdName);

  // Open create dialog when user explicitly opens it OR when no instances exist
  // (but not while the "Instance Deleted" dialog is still open)
  const hasNoInstances = !isLoadingInstances && instances.length === 0;
  const createInstanceDialogOpen =
    createDialogUserOpen || (hasNoInstances && !isDeletingDialogOpen);

  const handleCreateInstance = useCallback(() => {
    if (!draftConfig || !instanceName) {
      return;
    }
    setCreatedName(instanceName);
    setCreatingInstanceDialogOpen(true);
    createInstance({ config: draftConfig, instanceName });
  }, [createInstance, draftConfig, instanceName]);

  const handleRetry = useCallback(() => {
    resetCreateLogs();
    setCreateDialogUserOpen(true);
  }, [resetCreateLogs]);

  const handleCloseError = useCallback(() => {
    resetCreateLogs();
  }, [resetCreateLogs]);

  const handleStartInstance = useCallback(() => {
    if (createdName) {
      startInstance(createdName);
      setStartInstanceDialogOpen(false);
      setStartingInstanceDialogOpen(true);
    }
  }, [createdName, startInstance]);

  const handleCreateInstanceSuccess = useCallback(() => {
    setCreatingInstanceDialogOpen(false);
    setStartInstanceDialogOpen(true);
    resetDraft();
  }, [resetDraft]);

  const handleStartInstanceReady = useCallback(() => {
    if (createdName) {
      onEnvSetup(createdName);
    }
  }, [createdName, onEnvSetup]);

  const handleStartInstanceSuccess = useCallback(() => {
    setStartingInstanceDialogOpen(false);
    setActiveTab("lima");
  }, [setActiveTab]);

  return (
    <>
      <CreateInstanceDialog
        buttonClassName="ml-[6px]"
        open={createInstanceDialogOpen}
        dismissible={!hasNoInstances}
        onDialogOpenChange={setCreateDialogUserOpen}
        onClickCreate={handleCreateInstance}
      />
      <CreatingInstanceDialog
        open={creatingInstanceDialogOpen}
        onDialogOpenChange={setCreatingInstanceDialogOpen}
        onCreateInstanceSuccess={handleCreateInstanceSuccess}
        instanceName={createdName}
      />
      <ErrorCreateInstanceDialog
        onRetry={handleRetry}
        onClose={handleCloseError}
        instanceName={createdName}
      />
      <StartInstanceDialog
        open={startInstanceDialogOpen}
        onOpenChange={setStartInstanceDialogOpen}
        onStart={handleStartInstance}
        instanceName={createdName}
        variant="created"
      />
      <StartingInstanceDialog
        open={startingInstanceDialogOpen}
        onDialogOpenChange={setStartingInstanceDialogOpen}
        onReady={handleStartInstanceReady}
        onSuccess={handleStartInstanceSuccess}
        instanceName={createdName}
      />
    </>
  );
}
