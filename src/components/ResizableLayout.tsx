import { Fragment, isValidElement, useMemo, type ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";
import { useIsMobile } from "src/hooks/useMediaQuery";

interface ResizableLayoutProps {
  columns: ReactNode[];
  bottom: ReactNode;
  autoSaveId: string;
}

export function ResizableLayout({ columns, bottom, autoSaveId }: ResizableLayoutProps) {
  const isMobile = useIsMobile();
  const { resizableLayoutStorage } = useLayoutStorage();
  const lastColumnKey = useMemo(() => {
    const lastColumn = columns.at(-1);
    if (isValidElement(lastColumn) && lastColumn.key != null) {
      return String(lastColumn.key);
    }
    return null;
  }, [columns]);

  return (
    <ResizablePanelGroup
      direction="vertical"
      autoSaveId={autoSaveId}
      storage={resizableLayoutStorage}
    >
      {/* Top Section: Contains the columns (grid vertically on mobile, horizontally on desktop) */}
      {columns.length > 0 ? (
        <ResizablePanel defaultSize={40} minSize={10}>
          <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
            {columns.map((column) => {
              const columnKey =
                isValidElement(column) && column.key != null ? String(column.key) : String(column);
              return (
                <Fragment key={columnKey}>
                  <ResizablePanel defaultSize={100 / columns.length} minSize={10}>
                    {column}
                  </ResizablePanel>
                  {columnKey !== lastColumnKey && <ResizableHandle />}
                </Fragment>
              );
            })}
          </ResizablePanelGroup>
        </ResizablePanel>
      ) : (
        <ResizablePanel defaultSize={0} />
      )}

      <ResizableHandle className={columns.length > 0 ? "" : "hidden"} />

      {/* Bottom Section */}
      <ResizablePanel defaultSize={columns.length > 0 ? 60 : 100} minSize={15}>
        {bottom}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
