import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermTabs } from "./TermTabs";
import type { Terminal } from "src/services/Terminal";
import { TerminalRow } from "./TermRow";
import { EmptyTerminalState } from "./EmptyTerminalState";

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
  const mockOnSessionCreated = vi.fn();
  const mockOnCwdChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setMobile(false);
  });

  const renderTermTabs = (activeTabId: string) => {
    render(
      <TermTabs
        tabs={createMockTabs()}
        activeTabId={activeTabId}
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        onCwdChanged={mockOnCwdChanged}
        emptyState={createEmptyState(mockOnAddTab)}
      />,
    );
  };

  it("triggers onTabChange when a tab header is clicked", () => {
    renderTermTabs("tab-1");

    // Click Tab 2 since Tab 1 is already active
    const tabTrigger = screen.getByText("Tab 2");
    fireEvent.click(tabTrigger);

    expect(mockOnTabChange).toHaveBeenCalledWith("tab-2");
  });

  it("calls onAddTab when 'New Tab' button is clicked", () => {
    renderTermTabs("tab-1");

    const addButton = screen.getByTitle("New Tab");
    fireEvent.click(addButton);

    expect(mockOnAddTab).toHaveBeenCalledWith();
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
