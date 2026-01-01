import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { ImagesDialog } from "./ImagesDialog";
import { MountsDialog } from "./MountsDialog";
import { CopyToHostDialog } from "./CopyToHostDialog";
import { PortForwardsDialog } from "./PortForwardsDialog";

export function LimaConfigSystemColumn() {
    const { selectedName } = useSelectedInstance();
    const { isLoading } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            <ImagesDialog />
            <MountsDialog />
            <CopyToHostDialog />
            <PortForwardsDialog />
        </div >
    )
}