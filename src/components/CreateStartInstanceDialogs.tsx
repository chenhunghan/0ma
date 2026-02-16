import { useLimaInstance } from "src/hooks/useLimaInstance";
import { useLimaInstances } from "src/hooks/useLimaInstances";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { useEnvSetup } from "src/hooks/useEnvSetup";
import { CreateInstanceDialog } from "./CreateInstanceDialog";
import { CreatingInstanceDialog } from "./CreatingInstanceDialog";
import { EnvSetupDialog } from "./EnvSetupDialog";
import { ErrorCreateInstanceDialog } from "./ErrorCreateInstanceDialog";
import { StartInstanceDialog } from "./StartInstanceDialog";
import { StartingInstanceDialog } from "./StartingInstanceDialog";
import { useCallback, useState } from "react";
import { useOnLimaCreateLogs } from "src/hooks/useOnLimaCreateLogs";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";

// oxlint-disable-next-line max-statements
export function CreateStartInstanceDialogs({
  isDeletingDialogOpen,
}: {
  isDeletingDialogOpen?: boolean;
}) {
  const [createDialogUserOpen, setCreateDialogUserOpen] = useState(false);
  const [creatingInstanceDialogOpen, setCreatingInstanceDialogOpen] = useState(false);
  const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
  const [startingInstanceDialogOpen, setStartingInstanceDialogOpen] = useState(false);

  const { createInstance, startInstance } = useLimaInstance();
  const { instances, isLoading: isLoadingInstances } = useLimaInstances();
  const { setActiveTab } = useLayoutStorage();
  const { draftConfig, instanceName } = useCreateLimaInstanceDraft();
  const { reset: resetCreateLogs } = useOnLimaCreateLogs(instanceName);
  const envSetup = useEnvSetup();

  // Open create dialog when user explicitly opens it OR when no instances exist
  // (but not while the "Instance Deleted" dialog is still open)
  const hasNoInstances = !isLoadingInstances && instances.length === 0;
  const createInstanceDialogOpen =
    createDialogUserOpen || (hasNoInstances && !isDeletingDialogOpen);

  const handleCreateInstance = useCallback(() => {
    if (!draftConfig || !instanceName) {
      return;
    }
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
    if (instanceName) {
      startInstance(instanceName);
      setStartInstanceDialogOpen(false);
      setStartingInstanceDialogOpen(true);
    }
  }, [instanceName, startInstance]);

  const handleCreateInstanceSuccess = useCallback(() => {
    setCreatingInstanceDialogOpen(false);
    setStartInstanceDialogOpen(true);
  }, []);

  const handleStartInstanceReady = useCallback(() => {
    if (instanceName) {
      envSetup.triggerEnvSetup(instanceName);
    }
  }, [instanceName, envSetup]);

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
      />
      <ErrorCreateInstanceDialog onRetry={handleRetry} onClose={handleCloseError} />
      <StartInstanceDialog
        open={startInstanceDialogOpen}
        onOpenChange={setStartInstanceDialogOpen}
        onStart={handleStartInstance}
        instanceName={instanceName}
        variant="created"
      />
      <StartingInstanceDialog
        open={startingInstanceDialogOpen}
        onDialogOpenChange={setStartingInstanceDialogOpen}
        onReady={handleStartInstanceReady}
        onSuccess={handleStartInstanceSuccess}
        instanceName={instanceName}
      />
      <EnvSetupDialog
        open={envSetup.dialogOpen}
        onOpenChange={envSetup.setDialogOpen}
        instanceName={envSetup.instanceName}
        envShPath={envSetup.envShPath}
        onAddToProfile={envSetup.handleAddToProfile}
        onClose={envSetup.handleClose}
        profileMessage={envSetup.profileMessage}
        profileError={envSetup.profileError}
        isAddingToProfile={envSetup.isAddingToProfile}
      />
    </>
  );
}
