import { useMemo } from "react";
import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { LimaConfigResourceColumn } from "./LimaConfigResourceColumn";
import { LimaConfigSystemColumn } from "./LimaConfigSystemColumn";
import { LimaConfigAutomationColumn } from "./LimaConfigAutomationColumn";
import { LimaConfigEditor } from "./LimaConfigEditor";

export function LimaConfigTabContent({ tabValue }: { tabValue: string }) {
  const left = useMemo(
    () => (
      <div className="flex flex-col h-full overflow-y-auto">
        <LimaConfigResourceColumn />
        <LimaConfigSystemColumn />
        <LimaConfigAutomationColumn />
      </div>
    ),
    [],
  );

  const right = useMemo(() => <LimaConfigEditor />, []);

  return (
    <TabsContent value={tabValue} className="h-full" keepMounted>
      <ResizableLayout autoSaveId="lima-config-tabs-content" left={left} right={right} />
    </TabsContent>
  );
}
