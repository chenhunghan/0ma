import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { LimaConfigResourceColumn } from "./LimaConfigResourceColumn";
import { LimaConfigSystemColumn } from "./LimaConfigSystemColumn";
import { LimaConfigAutomationColumn } from "./LimaConfigAutomationColumn";
import { useIsMobile } from "src/hooks/useMediaQuery";
import { LimaConfigEditor } from "./LimaConfigEditor";

export function LimaConfigTabContent({ tabValue }: { tabValue: string }) {
    const isMobile = useIsMobile()
    return (
        <TabsContent value={tabValue} className="h-full">
            <ResizableLayout
                autoSaveId="lima-config-tabs-content"
                columns={isMobile ? [] : [
                    <ColunmWrapper key="1">
                        <LimaConfigResourceColumn />
                    </ColunmWrapper>,
                    <ColunmWrapper key="2">
                        <LimaConfigSystemColumn />
                    </ColunmWrapper>,
                    <ColunmWrapper key="3">
                        <LimaConfigAutomationColumn />
                    </ColunmWrapper>,
                ]}
                bottom={<LimaConfigEditor />}
            />
        </TabsContent>
    )
}

function ColunmWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full w-full justify-center">
            {children}
        </div>
    )
}

