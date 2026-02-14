import { useMemo } from "react";
import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { LimaConfigResourceColumn } from "./LimaConfigResourceColumn";
import { LimaConfigSystemColumn } from "./LimaConfigSystemColumn";
import { LimaConfigAutomationColumn } from "./LimaConfigAutomationColumn";
import { LimaConfigEditor } from "./LimaConfigEditor";

export function LimaConfigTabContent({ tabValue }: { tabValue: string }) {
  const columns = useMemo(
    () => [
      <ColunmWrapper key="1">
        <LimaConfigResourceColumn />
      </ColunmWrapper>,
      <ColunmWrapper key="2">
        <LimaConfigSystemColumn />
      </ColunmWrapper>,
      <ColunmWrapper key="3">
        <LimaConfigAutomationColumn />
      </ColunmWrapper>,
    ],
    [],
  );

  const bottom = useMemo(() => <LimaConfigEditor />, []);

  return (
    <TabsContent value={tabValue} className="h-full" keepMounted>
      <ResizableLayout autoSaveId="lima-config-tabs-content" columns={columns} bottom={bottom} />
    </TabsContent>
  );
}

function ColunmWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full w-full justify-center">{children}</div>;
}
