import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { ImagesDialog } from "./ImagesDialog";
import { MountsDialog } from "./MountsDialog";
import { CopyToHostDialog } from "./CopyToHostDialog";
import { PortForwardsDialog } from "./PortForwardsDialog";
import { ConfigSection } from "./ConfigSection";
import { ImageAccordion } from "./ImageAccordion";
import { MountsAccordion } from "./MountsAccordion";
import { CopyToHostAccordion } from "./CopyToHostAccordion";
import { PortForwardsAccordion } from "./PortForwardsAccordion";

export function LimaConfigSystemColumn() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField, isLoading } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
            <ConfigSection dialog={
                <ImagesDialog
                    value={draftConfig?.images || []}
                    onChange={(val) => updateField('images', val)}
                />
            }>
                <ImageAccordion value={draftConfig?.images || []} />
            </ConfigSection>

            <ConfigSection dialog={
                <MountsDialog
                    value={draftConfig?.mounts || []}
                    onChange={(val) => updateField('mounts', val)}
                />
            }>
                <MountsAccordion value={draftConfig?.mounts || []} />
            </ConfigSection>

            <ConfigSection dialog={
                <CopyToHostDialog
                    value={draftConfig?.copyToHost || []}
                    onChange={(val) => updateField('copyToHost', val)}
                />
            }>
                <CopyToHostAccordion value={draftConfig?.copyToHost || []} />
            </ConfigSection>

            <ConfigSection dialog={
                <PortForwardsDialog
                    value={draftConfig?.portForwards || []}
                    onChange={(val) => updateField('portForwards', val)}
                />
            }>
                <PortForwardsAccordion value={draftConfig?.portForwards || []} />
            </ConfigSection>
        </div >
    )
}