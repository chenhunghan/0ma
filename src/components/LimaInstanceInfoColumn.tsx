import { InfoIcon } from "lucide-react";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { useInstanceDiskUsage } from "src/hooks/useInstanceDiskUsage";
import { useInstanceIp } from "src/hooks/useInstanceIp";
import { useInstanceUptime } from "src/hooks/useInstanceUptime";
import { useInstanceGuestDiagnostics } from "src/hooks/useInstanceGuestDiagnostics";
import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { PortForwardsAccordion } from "./PortForwardsAccordion";
import { MountsAccordion } from "./MountsAccordion";
import { InstanceStatus } from "src/types/InstanceStatus";
import { Label } from "./ui/label";

export function LimaInstanceInfoColumn() {
  const { selectedInstance, selectedName } = useSelectedInstance();
  const isRunning = selectedInstance?.status === InstanceStatus.Running;

  const { data: diskUsage } = useInstanceDiskUsage(selectedName ?? "", isRunning);
  const { data: interfaces } = useInstanceIp(selectedName ?? "", isRunning);
  const { data: uptime } = useInstanceUptime(selectedName ?? "", isRunning);
  const { data: guest } = useInstanceGuestDiagnostics(selectedName ?? "", isRunning);
  const { actualConfig } = useUpdateLimaInstanceDraft();

  const primaryIp = interfaces?.[0]?.ip;

  if (!selectedInstance) {
    return null;
  }

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
      {/* Resources */}
      <Label className="text-muted-foreground/60">Resources</Label>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>CPUs</ItemTitle>
          <ItemDescription>{selectedInstance.cpus}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Memory</ItemTitle>
          <ItemDescription>{selectedInstance.memory}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Disk</ItemTitle>
          <ItemDescription>{selectedInstance.disk}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Arch</ItemTitle>
          <ItemDescription>{selectedInstance.arch}</ItemDescription>
        </ItemContent>
      </Item>

      <Separator />

      {/* Runtime */}
      <Label className="text-muted-foreground/60">Runtime</Label>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Status</ItemTitle>
          <ItemDescription>{selectedInstance.status}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Uptime</ItemTitle>
          <ItemDescription>{uptime || "\u2014"}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>
            IP Address
            {interfaces && interfaces.length > 1 && (
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  render={<span />}
                >
                  <InfoIcon className="size-2.5" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col gap-1 text-xs font-mono">
                    {interfaces.map((iface) => (
                      <div key={iface.name} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{iface.name}</span>
                        <span>{iface.ip}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </ItemTitle>
          <ItemDescription>{primaryIp || "\u2014"}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Disk Usage</ItemTitle>
          <ItemDescription>
            {diskUsage ? `${diskUsage.used} / ${diskUsage.total} (${diskUsage.use_percent})` : "\u2014"}
          </ItemDescription>
        </ItemContent>
      </Item>

      <Separator />

      {/* Guest */}
      <Label className="text-muted-foreground/60">Guest</Label>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>OS</ItemTitle>
          <ItemDescription>{guest?.os_pretty_name || "\u2014"}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Kernel</ItemTitle>
          <ItemDescription>{guest?.kernel_version || "\u2014"}</ItemDescription>
        </ItemContent>
      </Item>

      {/* Port Forwards */}
      {actualConfig?.portForwards && actualConfig.portForwards.length > 0 && (
        <>
          <Separator />
          <Label className="text-muted-foreground/60">Port Forwards</Label>
          <PortForwardsAccordion value={actualConfig.portForwards} />
        </>
      )}

      {/* Mounts */}
      {actualConfig?.mounts && actualConfig.mounts.length > 0 && (
        <>
          <Separator />
          <Label className="text-muted-foreground/60">Mounts</Label>
          <MountsAccordion value={actualConfig.mounts} />
        </>
      )}
    </div>
    </TooltipProvider>
  );
}
