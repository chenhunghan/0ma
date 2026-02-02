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

export function CreateInstanceConfigForm() {
  const { draftConfig, isLoading, updateField, instanceName, setInstanceName } =
    useCreateLimaInstanceDraft();

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
            onChange={(e) => setInstanceName(e.target.value)}
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
            onChange={(e) => updateField("cpus", Number(e.target.value))}
            className="w-full min-w-0"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-[60px_1fr] items-center gap-4">
          <Label htmlFor="memory" className="text-muted-foreground">
            Memory
          </Label>
          <Select
            value={draftConfig?.memory || "4GiB"}
            onValueChange={(val) => updateField("memory", val)}
          >
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
          <Select
            value={draftConfig?.disk || "100GiB"}
            onValueChange={(val) => updateField("disk", val)}
          >
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
          <Select
            value={draftConfig?.vmType || "vz"}
            onValueChange={(val) => updateField("vmType", val)}
          >
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

        <ConfigSection
          dialog={
            <ImagesDialog
              value={draftConfig.images || []}
              onChange={(val) => updateField("images", val)}
            />
          }
        >
          <ImageAccordion value={draftConfig.images || []} />
        </ConfigSection>

        <ConfigSection
          dialog={
            <MountsDialog
              value={draftConfig.mounts || []}
              onChange={(val) => updateField("mounts", val)}
            />
          }
        >
          <MountsAccordion value={draftConfig.mounts || []} />
        </ConfigSection>

        <ConfigSection
          dialog={
            <CopyToHostDialog
              value={draftConfig.copyToHost || []}
              onChange={(val) => updateField("copyToHost", val)}
            />
          }
        >
          <CopyToHostAccordion value={draftConfig.copyToHost || []} />
        </ConfigSection>

        <ConfigSection
          dialog={
            <PortForwardsDialog
              value={draftConfig.portForwards || []}
              onChange={(val) => updateField("portForwards", val)}
            />
          }
        >
          <PortForwardsAccordion value={draftConfig.portForwards || []} />
        </ConfigSection>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <ConfigSection
          dialog={
            <ProvisionStepsDialog
              value={draftConfig.provision || []}
              onChange={(val) => updateField("provision", val)}
            />
          }
        >
          <ProvisionStepsAccordion value={draftConfig.provision || []} />
        </ConfigSection>
        <ConfigSection
          dialog={
            <ProbesDialog
              value={draftConfig.probes || []}
              onChange={(val) => updateField("probes", val)}
            />
          }
        >
          <ProbesAccordion value={draftConfig.probes || []} />
        </ConfigSection>
      </div>
    </div>
  );
}
