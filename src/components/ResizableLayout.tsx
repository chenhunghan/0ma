import type { ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";
import { useIsMobile } from "src/hooks/useMediaQuery";

interface ResizableLayoutProps {
  left: ReactNode;
  right: ReactNode;
  autoSaveId: string;
}

export function ResizableLayout({ left, right, autoSaveId }: ResizableLayoutProps) {
  const isMobile = useIsMobile();
  const { resizableLayoutStorage } = useLayoutStorage();

  return (
    <ResizablePanelGroup
      direction={isMobile ? "vertical" : "horizontal"}
      autoSaveId={autoSaveId}
      storage={resizableLayoutStorage}
    >
      <ResizablePanel defaultSize={30} minSize={15}>
        {left}
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={70} minSize={15}>
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
