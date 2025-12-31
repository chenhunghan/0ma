import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { LimaConfigResourceColumn } from "./LimaConfigResourceColumn";
import { LimaConfigSystemColumn } from "./LimaConfigSystemColumn";
import { LimaConfigAutomationColumn } from "./LimaConfigAutomationColumn";
import { useIsMobile } from "src/hooks/useMediaQuery";

export function LimaConfigTabContent({ tabValue, instanceName }: { tabValue: string, instanceName: string }) {
    const isMobile = useIsMobile()
    return (
        <TabsContent value={tabValue} className="h-full">
            <ResizableLayout
                autoSaveId="lima-config-tabs-content"
                columns={isMobile ? [] : [
                    <ColunmWrapper key="1">
                        <LimaConfigResourceColumn instanceName={instanceName} />
                    </ColunmWrapper>,
                    <ColunmWrapper key="2">
                        <LimaConfigSystemColumn instanceName={instanceName} />
                    </ColunmWrapper>,
                    <ColunmWrapper key="3">
                        <LimaConfigAutomationColumn instanceName={instanceName} />
                    </ColunmWrapper>,
                ]}
                bottom={<div />}
            />
        </TabsContent>
    )
}

function ColunmWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            {children}
        </div>
    )
}

