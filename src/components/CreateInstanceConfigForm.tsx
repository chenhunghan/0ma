import { useMemo, type ChangeEvent } from "react";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import { Spinner } from "./ui/spinner";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ConfigSection } from "./ConfigSection";
import { ImagesDialog } from "./ImagesDialog";
import { CopyToHostDialog } from "./CopyToHostDialog";
import { PortForwardsDialog } from "./PortForwardsDialog";
import { MountsDialog } from "./MountsDialog";
import { MountsAccordion } from "./MountsAccordion";
import { CopyToHostAccordion } from "./CopyToHostAccordion";
import { PortForwardsAccordion } from "./PortForwardsAccordion";
import { ImageAccordion } from "./ImageAccordion";
import { ProvisionStepsDialog } from "./ProvisionStepsDialog";
import { ProvisionStepsAccordion } from "./ProvisionStepsAccordion";
import { ProbesDialog } from "./ProbesDialog";
import { ProbesAccordion } from "./ProbesAccordion";
import type { CopyToHost, Image, Mount, PortForward, Probe, Provision } from "src/types/LimaConfig";
import { useSystemCapabilities } from "src/hooks/useSystemCapabilities";

const EMPTY_IMAGES: Image[] = [];
const EMPTY_MOUNTS: Mount[] = [];
const EMPTY_COPY_TO_HOST: CopyToHost[] = [];
const EMPTY_PORT_FORWARDS: PortForward[] = [];
const EMPTY_PROVISION: Provision[] = [];
const EMPTY_PROBES: Probe[] = [];

export function CreateInstanceConfigForm() {
  const { draftConfig, isLoading, updateField, instanceName, setInstanceName } =
    useCreateLimaInstanceDraft();
  const { isKrunkitSupported } = useSystemCapabilities();
  const images = draftConfig?.images ?? EMPTY_IMAGES;
  const mounts = draftConfig?.mounts ?? EMPTY_MOUNTS;
  const copyToHost = draftConfig?.copyToHost ?? EMPTY_COPY_TO_HOST;
  const portForwards = draftConfig?.portForwards ?? EMPTY_PORT_FORWARDS;
  const provision = draftConfig?.provision ?? EMPTY_PROVISION;
  const probes = draftConfig?.probes ?? EMPTY_PROBES;

  const handlers = useMemo(
    () => ({
      copyToHost: (nextRules: CopyToHost[]) => {
        updateField("copyToHost", nextRules);
      },
      cpu: (event: ChangeEvent<HTMLInputElement>) => {
        updateField("cpus", Number(event.target.value));
      },
      disk: (value: string | null) => {
        updateField("disk", value || "100GiB");
      },
      images: (nextImages: Image[]) => {
        updateField("images", nextImages);
      },
      instanceName: (event: ChangeEvent<HTMLInputElement>) => {
        setInstanceName(event.target.value);
      },
      memory: (value: string | null) => {
        updateField("memory", value || "4GiB");
      },
      mounts: (nextMounts: Mount[]) => {
        updateField("mounts", nextMounts);
      },
      portForwards: (nextPortForwards: PortForward[]) => {
        updateField("portForwards", nextPortForwards);
      },
      probes: (nextProbes: Probe[]) => {
        updateField("probes", nextProbes);
      },
      provision: (nextProvision: Provision[]) => {
        updateField("provision", nextProvision);
      },
      vmType: (value: string | null) => {
        const newVmType = value || "vz";
        updateField("vmType", newVmType);
        if (newVmType === "krunkit") {
          updateField("rosetta" as keyof typeof draftConfig, undefined);
        } else {
          updateField("gpu", undefined);
        }
      },
      gpu: (value: string | null) => {
        updateField("gpu", value === "enabled" ? { enabled: true } : undefined);
      },
    }),
    [draftConfig, setInstanceName, updateField],
  );

  const dialogs = useMemo(
    () => ({
      copyToHost: <CopyToHostDialog value={copyToHost} onChange={handlers.copyToHost} />,
      images: <ImagesDialog value={images} onChange={handlers.images} />,
      mounts: <MountsDialog value={mounts} onChange={handlers.mounts} />,
      portForwards: <PortForwardsDialog value={portForwards} onChange={handlers.portForwards} />,
      probes: <ProbesDialog value={probes} onChange={handlers.probes} />,
      provision: <ProvisionStepsDialog value={provision} onChange={handlers.provision} />,
    }),
    [copyToHost, handlers, images, mounts, portForwards, probes, provision],
  );

  if (isLoading || !draftConfig) {
    return (
      <div title="Loading Lima Config...">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full px-4 py-4 lg:px-8 lg:py-4 relative overflow-y-auto max-h-full items-start">
      <div className="flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="instanceName" className="text-muted-foreground">
            Name
          </Label>
          <Input
            type="text"
            id="instanceName"
            value={instanceName}
            onChange={handlers.instanceName}
            className="w-full min-w-0"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="cpus" className="text-muted-foreground">
            CPUs
          </Label>
          <Input
            type="number"
            min={1}
            max={128}
            id="cpus"
            value={draftConfig?.cpus || ""}
            onChange={handlers.cpu}
            className="w-full min-w-0"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="memory" className="text-muted-foreground">
            Memory
          </Label>
          <Select value={draftConfig?.memory || "4GiB"} onValueChange={handlers.memory}>
            <SelectTrigger id="memory" className="w-full min-w-0" size="sm">
              <SelectValue placeholder="Select" />
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

        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="disk" className="text-muted-foreground">
            Disk
          </Label>
          <Select value={draftConfig?.disk || "100GiB"} onValueChange={handlers.disk}>
            <SelectTrigger id="disk" className="w-full min-w-0" size="sm">
              <SelectValue placeholder="Select" />
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

        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="vmType" className="text-muted-foreground">
            VmType
          </Label>
          <Select value={draftConfig?.vmType || "vz"} onValueChange={handlers.vmType}>
            <SelectTrigger id="vmType" className="w-full min-w-0" size="sm">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vz">VZ</SelectItem>
              <SelectItem value="qemu">QEMU</SelectItem>
              <SelectItem value="krunkit">Krunkit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {draftConfig?.vmType === "krunkit" && !isKrunkitSupported && (
          <p className="text-xs text-amber-500 ml-[76px]">
            Krunkit requires macOS 14+, Apple Silicon, and the krunkit binary installed.
          </p>
        )}

        {draftConfig?.vmType === "krunkit" && (
          <div className="grid grid-cols-[60px_1fr] items-center gap-4">
            <Label htmlFor="gpu" className="text-muted-foreground">
              GPU
            </Label>
            <Select
              value={draftConfig?.gpu?.enabled ? "enabled" : "disabled"}
              onValueChange={handlers.gpu}
            >
              <SelectTrigger id="gpu" className="w-full min-w-0" size="sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <ConfigSection dialog={dialogs.images}>
          <ImageAccordion value={images} />
        </ConfigSection>

        <ConfigSection dialog={dialogs.mounts}>
          <MountsAccordion value={mounts} />
        </ConfigSection>

        <ConfigSection dialog={dialogs.copyToHost}>
          <CopyToHostAccordion value={copyToHost} />
        </ConfigSection>

        <ConfigSection dialog={dialogs.portForwards}>
          <PortForwardsAccordion value={portForwards} />
        </ConfigSection>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <ConfigSection dialog={dialogs.provision}>
          <ProvisionStepsAccordion value={provision} />
        </ConfigSection>
        <ConfigSection dialog={dialogs.probes}>
          <ProbesAccordion value={probes} />
        </ConfigSection>
      </div>
    </div>
  );
}
