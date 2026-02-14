import { useCallback, useMemo } from "react";
import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { Spinner } from "./ui/spinner";
import { ProvisionStepsDialog } from "./ProvisionStepsDialog";
import { ProbesDialog } from "./ProbesDialog";
import { ConfigSection } from "./ConfigSection";
import { ProvisionStepsAccordion } from "./ProvisionStepsAccordion";
import { ProbesAccordion } from "./ProbesAccordion";
import type { Probe, Provision } from "src/types/LimaConfig";

const EMPTY_PROVISION: Provision[] = [];
const EMPTY_PROBES: Probe[] = [];

export function LimaConfigAutomationColumn() {
  const { draftConfig, updateField, isLoading } = useUpdateLimaInstanceDraft();

  const provision = draftConfig?.provision ?? EMPTY_PROVISION;
  const probes = draftConfig?.probes ?? EMPTY_PROBES;

  const handleProvisionChange = useCallback(
    (nextProvision: Provision[]) => {
      updateField("provision", nextProvision);
    },
    [updateField],
  );

  const handleProbesChange = useCallback(
    (nextProbes: Probe[]) => {
      updateField("probes", nextProbes);
    },
    [updateField],
  );

  const provisionDialog = useMemo(
    () => <ProvisionStepsDialog value={provision} onChange={handleProvisionChange} />,
    [provision, handleProvisionChange],
  );
  const probesDialog = useMemo(
    () => <ProbesDialog value={probes} onChange={handleProbesChange} />,
    [probes, handleProbesChange],
  );

  if (isLoading) {
    return (
      <div title="Loading Lima Config...">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto">
      <ConfigSection dialog={provisionDialog}>
        <ProvisionStepsAccordion value={provision} />
      </ConfigSection>

      <ConfigSection dialog={probesDialog}>
        <ProbesAccordion value={probes} />
      </ConfigSection>
    </div>
  );
}
