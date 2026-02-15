import { useLimaInstance } from "src/hooks/useLimaInstance";
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

export function CreateStartInstanceDialogs() {
  const [createInstanceDialogOpen, setCreateInstanceDialogOpen] = useState(false);
  const [creatingInstanceDialogOpen, setCreatingInstanceDialogOpen] = useState(false);
  const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
  const [startingInstanceDialogOpen, setStartingInstanceDialogOpen] = useState(false);

  const { createInstance, startInstance } = useLimaInstance();
  const { setActiveTab } = useLayoutStorage();
  const { draftConfig, instanceName } = useCreateLimaInstanceDraft();
  const { reset: resetCreateLogs } = useOnLimaCreateLogs(instanceName);
  const envSetup = useEnvSetup();

  const handleCreateInstance = useCallback(() => {
    if (!draftConfig || !instanceName) {
      return;
    }
    setCreatingInstanceDialogOpen(true);
    createInstance({ config: draftConfig, instanceName });
  }, [createInstance, draftConfig, instanceName]);

  const handleRetry = useCallback(() => {
    resetCreateLogs();
    setCreateInstanceDialogOpen(true);
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

  const handleStartInstanceSuccess = useCallback(() => {
    setStartingInstanceDialogOpen(false);
    setActiveTab("lima");
    if (instanceName) {
      envSetup.triggerEnvSetup(instanceName);
    }
  }, [setActiveTab, instanceName, envSetup]);

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
