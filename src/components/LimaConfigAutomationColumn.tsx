import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import { ProvisionStepsDialog } from "./ProvisionStepsDialog";
import { ProbesDialog } from "./ProbesDialog";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";

export function LimaConfigAutomationColumn() {
    const { selectedName } = useSelectedInstance();
    const {
        isLoading,
    } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            {/* Provision Section */}
            <div className="grid w-full items-center gap-1.5 border border-border/50 rounded-lg p-4 bg-muted/5">
                <ProvisionStepsDialog />
            </div>

            {/* Probes Section */}
            <div className="grid w-full items-center gap-1.5 border border-border/50 rounded-lg p-4 bg-muted/5">
                <ProbesDialog />
            </div>
        </div>
    )
}
