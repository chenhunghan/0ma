import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermTabs } from "./TermTabs";
import type { Terminal } from "src/services/Terminal";
import { TerminalRow } from "./TermRow";
import { EmptyTerminalState } from "./EmptyTerminalState";

// Mock TerminalComponent to avoid xterm/provider dependencies in unit tests
vi.mock("./TerminalComponent", () => ({
  TerminalComponent: ({ termId }: { termId: number }) =>
    createElement("div", { "data-testid": `terminal-${termId}` }, `Terminal ${termId}`),
}));

// Mock useTerminalResizeContext to avoid needing TerminalResizeProvider
vi.mock("src/contexts/useTerminalResizeContext", () => ({
  useTerminalResizeContext: () => ({ onDragStart: vi.fn(), onDragEnd: vi.fn() }),
}));

// Utility to mock window.matchMedia state
const setMobile = (isMobile: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: isMobile,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
};

const createMockTerminals = (): Terminal[] => [
  { id: 1, name: "Term 1" },
  { id: 2, name: "Term 2" },
];

const createMockTabs = () => [
  {
    id: "tab-1",
    name: "Tab 1",
    terminals: [{ id: 1, name: "Term 1" }],
  },
  {
    id: "tab-2",
    name: "Tab 2",
    terminals: [{ id: 2, name: "Term 2" }],
  },
];

const createEmptyState = (onAdd: () => void) => createElement(EmptyTerminalState, { onAdd });

describe("TerminalRow", () => {
  const mockOnSessionCreated = vi.fn();
  const mockOnCwdChanged = vi.fn();
  const mockOnTitleChanged = vi.fn();
  const mockOnRemoveTerminal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setMobile(false); // Default to desktop
  });

  it("renders each terminal content in its own panel", () => {
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={createMockTerminals()}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        initialCommand="zsh"
        initialArgs={[]}
        onRemoveTerminal={mockOnRemoveTerminal}
      />,
    );
    expect(screen.getByTestId("resizable-panel-group")).toBeInTheDocument();
  });

  it("contains exactly N-1 resize handles for N terminals", () => {
    const terminals = createMockTerminals();
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={terminals}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        initialCommand="zsh"
        initialArgs={[]}
        onRemoveTerminal={mockOnRemoveTerminal}
      />,
    );

    // Resize handles have data-slot="resizable-handle" (from our resizable.tsx)
    const handles = screen.getAllByTestId("resizable-handle");
    expect(handles).toHaveLength(terminals.length - 1);
  });

  it("sets horizontal direction on desktop", () => {
    setMobile(false);
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={createMockTerminals()}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        initialCommand="zsh"
        initialArgs={[]}
        onRemoveTerminal={mockOnRemoveTerminal}
      />,
    );

    const group = screen.getByTestId("resizable-panel-group");
    expect(group).toHaveAttribute("data-panel-group-direction", "horizontal");
  });

  it("sets vertical direction on mobile", () => {
    setMobile(true);
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={createMockTerminals()}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        initialCommand="zsh"
        initialArgs={[]}
        onRemoveTerminal={mockOnRemoveTerminal}
      />,
    );

    const group = screen.getByTestId("resizable-panel-group");
    expect(group).toHaveAttribute("data-panel-group-direction", "vertical");
  });

  it("hides visual drag handles on mobile", () => {
    setMobile(true);
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={createMockTerminals()}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        initialCommand="zsh"
        initialArgs={[]}
        onRemoveTerminal={mockOnRemoveTerminal}
      />,
    );

    const handleIndicators = screen.queryByRole("separator")?.querySelector("div");
    expect(handleIndicators).toBeNull();
  });
});

describe("TermTabs", () => {
  const mockOnTabChange = vi.fn();
  const mockOnAddTab = vi.fn();
  const mockOnAddSideBySide = vi.fn();
  const mockOnRemoveTab = vi.fn();
  const mockOnRemoveTerminal = vi.fn();
  const mockOnSessionCreated = vi.fn();
  const mockOnCwdChanged = vi.fn();
  const mockOnTitleChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setMobile(false);
  });

  const renderTermTabs = (activeTabId: string) => {
    render(
      <TermTabs
        tabs={createMockTabs()}
        activeTabId={activeTabId}
        initialCommand="limactl"
        initialArgs={["shell", "default"]}
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddBtopTab={vi.fn()}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onRemoveTerminal={mockOnRemoveTerminal}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        onTitleChanged={mockOnTitleChanged}
        emptyState={createEmptyState(mockOnAddTab)}
      />,
    );
  };

  it("triggers onTabChange when a tab header is clicked", () => {
    renderTermTabs("tab-1");

    // Click Tab 2 since Tab 1 is already active
    const tabTrigger = screen.getByText("Tab 2");
    fireEvent.click(tabTrigger);

    expect(mockOnTabChange).toHaveBeenCalledWith("tab-2", expect.anything());
  });

  it("calls onAddTab when 'New Terminal' button is clicked", () => {
    renderTermTabs("tab-1");

    const addButton = screen.getByTitle("New Terminal");
    fireEvent.click(addButton);

    expect(mockOnAddTab).toHaveBeenCalled();
  });

  it("calls onAddSideBySide when 'Side-by-side' button is clicked", () => {
    renderTermTabs("tab-1");

    const sideBySideButton = screen.getByTitle("Side-by-side");
    fireEvent.click(sideBySideButton);

    expect(mockOnAddSideBySide).toHaveBeenCalledWith("tab-1");
  });

  it("disables Side-by-side button when no tab is active", () => {
    renderTermTabs("");

    const button = screen.getByTitle("Side-by-side");
    expect(button).toBeDisabled();
  });

  it("calls onRemoveTab when tab close button is clicked", () => {
    renderTermTabs("tab-1");

    const closeButtons = screen.getAllByTitle("Close Tab");
    fireEvent.click(closeButtons[0]); // Close first tab

    expect(mockOnRemoveTab).toHaveBeenCalledWith("tab-1");
  });
});
