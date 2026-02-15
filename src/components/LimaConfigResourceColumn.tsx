import { useCallback, type ChangeEvent } from "react";
import { InfoIcon } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { Spinner } from "./ui/spinner";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Separator } from "./ui/separator";
import { useSystemCapabilities } from "src/hooks/useSystemCapabilities";

function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor: string;
  label: string;
  tooltip: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          render={<span />}
        >
          <InfoIcon className="size-2.5" />
        </TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    </Label>
  );
}

export function LimaConfigResourceColumn() {
  const { draftConfig, actualConfig, isLoading, updateField } = useUpdateLimaInstanceDraft();
  const { isKrunkitSupported, krunkitMissingReasons } = useSystemCapabilities();
  const isKrunkit = actualConfig?.vmType === "krunkit";

  const handleCpuChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateField("cpus", Number(event.target.value));
    },
    [updateField],
  );

  const handleMemoryChange = useCallback(
    (value: string | null) => {
      updateField("memory", value || "4GiB");
    },
    [updateField],
  );

  const handleDiskChange = useCallback(
    (value: string | null) => {
      updateField("disk", value || "100GiB");
    },
    [updateField],
  );

  if (isLoading) {
    return (
      <div title="Loading Lima Config...">
        <Spinner />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
        <div className="grid w-full items-center gap-1.5">
          <LabelWithTooltip
            htmlFor="cpus"
            label="CPUs"
            tooltip="Virtual CPUs available to the VM. Shared with host, not exclusively reserved. Lima default: min(4, host cores)."
          />
          <Input
            type="number"
            id="cpus"
            min={1}
            max={128}
            value={draftConfig?.cpus || ""}
            onChange={handleCpuChange}
            className="w-full"
          />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <LabelWithTooltip
            htmlFor="memory"
            label="Memory"
            tooltip="RAM allocated to the VM. Lima default: min(4GiB, half of host memory)."
          />
          <Select value={draftConfig?.memory || "4GiB"} onValueChange={handleMemoryChange}>
            <SelectTrigger id="memory" className="w-full">
              <SelectValue placeholder="Select memory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2GiB">2GiB</SelectItem>
              <SelectItem value="4GiB">4GiB</SelectItem>
              <SelectItem value="8GiB">8GiB</SelectItem>
              <SelectItem value="16GiB">16GiB</SelectItem>
              <SelectItem value="32GiB">32GiB</SelectItem>
              <SelectItem value="64GiB">64GiB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <LabelWithTooltip
            htmlFor="disk"
            label="Disk"
            tooltip="Max virtual disk size. Only uses host disk space as needed. Lima default: 100GiB."
          />
          <Select value={draftConfig?.disk || "100GiB"} onValueChange={handleDiskChange}>
            <SelectTrigger id="disk" className="w-full">
              <SelectValue placeholder="Select disk size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10GiB">10GiB</SelectItem>
              <SelectItem value="25GiB">25GiB</SelectItem>
              <SelectItem value="50GiB">50GiB</SelectItem>
              <SelectItem value="100GiB">100GiB</SelectItem>
              <SelectItem value="250GiB">250GiB</SelectItem>
              <SelectItem value="500GiB">500GiB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="grid w-full items-center gap-1.5">
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>VM Type</ItemTitle>
              <ItemDescription>{(actualConfig?.vmType || "vz").toUpperCase()}</ItemDescription>
            </ItemContent>
          </Item>
        </div>
        {isKrunkit && (
          <div className="grid w-full items-center gap-1.5">
            <Item variant="muted">
              <ItemContent>
                <ItemTitle>GPU Passthrough</ItemTitle>
                <ItemDescription>{actualConfig?.gpu?.enabled ? "Enabled" : "Disabled"}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        )}
        {isKrunkit && !isKrunkitSupported && krunkitMissingReasons.length > 0 && (
          <ul className="text-xs text-amber-500 list-disc list-inside">
            {krunkitMissingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        <div className="grid w-full items-center gap-1.5">
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>Lima Minimum Version</ItemTitle>
              <ItemDescription>{actualConfig?.minimumLimaVersion || "N/A"}</ItemDescription>
            </ItemContent>
          </Item>
        </div>
      </div>
    </TooltipProvider>
  );
}
