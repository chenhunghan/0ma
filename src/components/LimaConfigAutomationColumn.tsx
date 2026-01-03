import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { Spinner } from "./ui/spinner";
import { ProvisionStepsDialog } from "./ProvisionStepsDialog";
import { ProbesDialog } from "./ProbesDialog";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { ConfigSection } from "./ConfigSection";
import { ProvisionStepsAccordion } from "./ProvisionStepsAccordion";
import { ProbesAccordion } from "./ProbesAccordion";

export function LimaConfigAutomationColumn() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField, isLoading } = useUpdateLimaInstanceDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
            <ConfigSection dialog={
                <ProvisionStepsDialog
                    value={draftConfig?.provision || []}
                    onChange={(val) => updateField('provision', val)}
                />
            }>
                <ProvisionStepsAccordion value={draftConfig?.provision || []} />
            </ConfigSection>

            <ConfigSection dialog={
                <ProbesDialog
                    value={draftConfig?.probes || []}
                    onChange={(val) => updateField('probes', val)}
                />
            }>
                <ProbesAccordion value={draftConfig?.probes || []} />
            </ConfigSection>
        </div>
    )
}
