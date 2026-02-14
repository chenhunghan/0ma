import { useMemo } from "react";
import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { Spinner } from "./ui/spinner";
import { ImagesDialog } from "./ImagesDialog";
import { MountsDialog } from "./MountsDialog";
import { CopyToHostDialog } from "./CopyToHostDialog";
import { PortForwardsDialog } from "./PortForwardsDialog";
import { ConfigSection } from "./ConfigSection";
import { ImageAccordion } from "./ImageAccordion";
import { MountsAccordion } from "./MountsAccordion";
import { CopyToHostAccordion } from "./CopyToHostAccordion";
import { PortForwardsAccordion } from "./PortForwardsAccordion";
import type { CopyToHost, Image, Mount, PortForward } from "src/types/LimaConfig";

const EMPTY_IMAGES: Image[] = [];
const EMPTY_MOUNTS: Mount[] = [];
const EMPTY_COPY_TO_HOST: CopyToHost[] = [];
const EMPTY_PORT_FORWARDS: PortForward[] = [];

export function LimaConfigSystemColumn() {
  const { draftConfig, updateField, isLoading } = useUpdateLimaInstanceDraft();

  if (isLoading) {
    return (
      <div title="Loading Lima Config...">
        <Spinner />
      </div>
    );
  }

  const images = draftConfig?.images ?? EMPTY_IMAGES;
  const mounts = draftConfig?.mounts ?? EMPTY_MOUNTS;
  const copyToHost = draftConfig?.copyToHost ?? EMPTY_COPY_TO_HOST;
  const portForwards = draftConfig?.portForwards ?? EMPTY_PORT_FORWARDS;
  const handlers = useMemo(
    () => ({
      copyToHost: (nextRules: CopyToHost[]) => updateField("copyToHost", nextRules),
      images: (nextImages: Image[]) => updateField("images", nextImages),
      mounts: (nextMounts: Mount[]) => updateField("mounts", nextMounts),
      portForwards: (nextPortForwards: PortForward[]) =>
        updateField("portForwards", nextPortForwards),
    }),
    [updateField],
  );

  const dialogs = useMemo(
    () => ({
      copyToHost: <CopyToHostDialog value={copyToHost} onChange={handlers.copyToHost} />,
      images: <ImagesDialog value={images} onChange={handlers.images} />,
      mounts: <MountsDialog value={mounts} onChange={handlers.mounts} />,
      portForwards: <PortForwardsDialog value={portForwards} onChange={handlers.portForwards} />,
    }),
    [copyToHost, handlers, images, mounts, portForwards],
  );

  return (
    <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
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
  );
}
