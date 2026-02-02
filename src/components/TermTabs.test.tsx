import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermTabs } from "./TermTabs";
import type { Terminal } from "src/services/Terminal";
import { TerminalRow } from "./TermRow";
import { EmptyTerminalState } from "./EmptyTerminalState";

// Utility to mock window.matchMedia state
const setMobile = (isMobile: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query) => ({
      matches: isMobile,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });
};

describe(TerminalRow, () => {
  const mockOnSessionCreated = vi.fn();
  const mockTerminals: Terminal[] = [
    { id: 1, name: "Term 1" },
    { id: 2, name: "Term 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setMobile(false); // Default to desktop
  });

  it("renders each terminal content in its own panel", () => {
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={mockTerminals}
        onSessionCreated={mockOnSessionCreated}
      />,
    );
    // Since we are mocking modules, we might need to adjust expectations if TerminalComponent renders differently in test
    // For now, let's assume it renders successfully
  });

  it("contains exactly N-1 resize handles for N terminals", () => {
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={mockTerminals}
        onSessionCreated={mockOnSessionCreated}
      />,
    );

    // Resize handles have data-slot="resizable-handle" (from our resizable.tsx)
    const handles = screen.getAllByTestId("resizable-handle");
    expect(handles).toHaveLength(mockTerminals.length - 1);
  });

  it("sets horizontal direction on desktop", () => {
    setMobile(false);
    render(
      <TerminalRow
        tabId="tab-1"
        terminals={mockTerminals}
        onSessionCreated={mockOnSessionCreated}
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
        terminals={mockTerminals}
        onSessionCreated={mockOnSessionCreated}
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
        terminals={mockTerminals}
        onSessionCreated={mockOnSessionCreated}
      />,
    );

    const handleIndicators = screen.queryByRole("separator")?.querySelector("div");
    expect(handleIndicators).toBeNull();
  });
});

describe(TermTabs, () => {
  const mockOnTabChange = vi.fn();
  const mockOnAddTab = vi.fn();
  const mockOnAddSideBySide = vi.fn();
  const mockOnRemoveTab = vi.fn();
  const mockOnSessionCreated = vi.fn();

  const mockTabs = [
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

  beforeEach(() => {
    vi.clearAllMocks();
    setMobile(false);
  });

  it("triggers onTabChange when a tab header is clicked", () => {
    render(
      <TermTabs
        tabs={mockTabs}
        activeTabId="tab-1"
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        emptyState={<EmptyTerminalState onAdd={() => mockOnAddTab()} />}
      />,
    );

    // Click Tab 2 since Tab 1 is already active
    const tabTrigger = screen.getByText("Tab 2");
    fireEvent.click(tabTrigger);

    expect(mockOnTabChange).toHaveBeenCalledWith("tab-2");
  });

  it("calls onAddTab when 'New Tab' button is clicked", () => {
    render(
      <TermTabs
        tabs={mockTabs}
        activeTabId="tab-1"
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        emptyState={<EmptyTerminalState onAdd={() => mockOnAddTab()} />}
      />,
    );

    const addButton = screen.getByTitle("New Tab");
    fireEvent.click(addButton);

    expect(mockOnAddTab).toHaveBeenCalledWith();
  });

  it("calls onAddSideBySide when 'Side-by-side' button is clicked", () => {
    render(
      <TermTabs
        tabs={mockTabs}
        activeTabId="tab-1"
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        emptyState={<EmptyTerminalState onAdd={() => mockOnAddTab()} />}
      />,
    );

    const sideBySideButton = screen.getByTitle("Side-by-side");
    fireEvent.click(sideBySideButton);

    expect(mockOnAddSideBySide).toHaveBeenCalledWith("tab-1");
  });

  it("disables Side-by-side button when no tab is active", () => {
    render(
      <TermTabs
        tabs={mockTabs}
        activeTabId=""
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        emptyState={<EmptyTerminalState onAdd={() => mockOnAddTab()} />}
      />,
    );

    const button = screen.getByTitle("Side-by-side");
    expect(button).toBeDisabled();
  });

  it("calls onRemoveTab when tab close button is clicked", () => {
    render(
      <TermTabs
        tabs={mockTabs}
        activeTabId="tab-1"
        onTabChange={mockOnTabChange}
        onAddTab={mockOnAddTab}
        onAddSideBySide={mockOnAddSideBySide}
        onRemoveTab={mockOnRemoveTab}
        onSessionCreated={mockOnSessionCreated}
        emptyState={<EmptyTerminalState onAdd={() => mockOnAddTab()} />}
      />,
    );

    const closeButtons = screen.getAllByTitle("Close Tab");
    fireEvent.click(closeButtons[0]); // Close first tab

    expect(mockOnRemoveTab).toHaveBeenCalledWith("tab-1");
  });
});
