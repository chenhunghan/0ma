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
    const { isLoading } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            <ConfigSection dialog={<ImagesDialog />}>
                <ImageAccordion />
            </ConfigSection>

            <ConfigSection dialog={<MountsDialog />}>
                <MountsAccordion />
            </ConfigSection>

            <ConfigSection dialog={<CopyToHostDialog />}>
                <CopyToHostAccordion />
            </ConfigSection>

            <ConfigSection dialog={<PortForwardsDialog />}>
                <PortForwardsAccordion />
            </ConfigSection>
        </div >
    )
}