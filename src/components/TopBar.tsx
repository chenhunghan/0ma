import { useCallback, useState } from "react";
import { TrashIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Button } from "src/components/ui/button";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { useLimaInstance } from "src/hooks/useLimaInstance";
import { Spinner } from "./ui/spinner";
import type { LimaInstance } from "src/types/LimaInstance";
import { useLimaInstances } from "src/hooks/useLimaInstances";
import { CreateStartInstanceDialogs } from "./CreateStartInstanceDialogs";
import { DeleteInstanceDialog } from "./DeleteInstanceDialog";
import { DeletingInstanceDialog } from "./DeletingInstanceDialog";
import { StopInstanceDialogs } from "./StopInstanceDialogs";
import { ApplyResetDraftDialogs } from "./ApplyResetDraftDialogs";

export function TopBar() {
  return (
    <div className="w-full px-[8px] py-[6px] flex items-center">
      {/* Left side */}
      <div className="flex items-center flex-1">
        <InstanceSelector />
        {/** Create new instance button and dialogs it triggers */}
        <CreateStartInstanceDialogs />
      </div>

      {/* Middle side - hidden on mobile */}
      <InstanceName className="text-xs hidden md:block" />

      {/* Right side */}
      <div className="flex items-center justify-end flex-1 gap-1">
        {/** Apply/Reset config draft buttons and dialogs */}
        <ApplyResetDraftDialogs />
        {/** Stop/Start instance button and dialogs it triggers */}
        <StopInstanceDialogs />
        <DeleteInstanceButton />
      </div>
    </div>
  );
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
  );
}

export function DeleteInstanceButton({ className }: { className?: string }) {
  const { selectedName, isLoading } = useSelectedInstance();
  const { deleteInstance } = useLimaInstance();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);

  const handleClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedName) {
      deleteInstance(selectedName);
      setDeletingOpen(true);
    }
  }, [selectedName, deleteInstance]);

  const handleDeleteSuccess = useCallback(() => {
    setDeletingOpen(false);
  }, []);

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        aria-label="Delete Lima instance"
        className={className}
        disabled={!selectedName || isLoading}
        onClick={handleClick}
      >
        <TrashIcon />
      </Button>
      <DeleteInstanceDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        instanceName={selectedName}
        onConfirm={handleConfirmDelete}
      />
      <DeletingInstanceDialog
        open={deletingOpen}
        onDialogOpenChange={setDeletingOpen}
        instanceName={selectedName}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}

export function InstanceName({ className }: { className?: string }) {
  const { selectedName, isLoading } = useSelectedInstance();
  if (isLoading) {
    return (
      <span className={className} title="Loading Lima instances">
        <Spinner />
      </span>
    );
  }
  return (
    <span className={className} title={`Selected Lima instance: ${selectedName}`}>
      {selectedName}
    </span>
  );
}
