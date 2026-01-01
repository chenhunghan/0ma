import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import { ProvisionStepsDialog } from "./ProvisionStepsDialog";
import { ProbesDialog } from "./ProbesDialog";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { ConfigSection } from "./ConfigSection";
import { ProvisionStepsAccordion } from "./ProvisionStepsAccordion";
import { ProbesAccordion } from "./ProbesAccordion";

export function LimaConfigAutomationColumn() {
    const { selectedName } = useSelectedInstance();
    const { isLoading } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            <ConfigSection dialog={<ProvisionStepsDialog />}>
                <ProvisionStepsAccordion />
            </ConfigSection>

            <ConfigSection dialog={<ProbesDialog />}>
                <ProbesAccordion />
            </ConfigSection>
        </div>
    )
}
