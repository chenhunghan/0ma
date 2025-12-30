import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TerminalRow, Terminal, TermTabs } from "./TermTabs"

// Utility to mock window.matchMedia state
const setMobile = (isMobile: boolean) => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
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
    })
}

describe("TerminalRow", () => {
    const mockOnRemove = vi.fn()
    const mockTerminals: Terminal[] = [
        { id: 1, name: "Term 1", content: <div data-testid="term-1">Term 1</div> },
        { id: 2, name: "Term 2", content: <div data-testid="term-2">Term 2</div> },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        setMobile(false) // Default to desktop
    })

    it("renders each terminal content in its own panel", () => {
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        expect(screen.getByTestId("term-1")).toBeInTheDocument()
        expect(screen.getByTestId("term-2")).toBeInTheDocument()
    })

    it("contains exactly N-1 resize handles for N terminals", () => {
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        // Resize handles have data-slot="resizable-handle" (from our resizable.tsx)
        const handles = screen.getAllByTestId("resizable-handle")
        expect(handles).toHaveLength(mockTerminals.length - 1)
    })

    it("triggers onRemove with correct IDs when close is clicked", () => {
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        const closeButtons = screen.getAllByTitle("Close Terminal")
        fireEvent.click(closeButtons[1]) // Click second terminal close button

        expect(mockOnRemove).toHaveBeenCalledWith("tab-1", 2)
    })

    it("prevents close button click from bubbling to panel container", () => {
        const onContainerClick = vi.fn()
        render(
            <div onClick={onContainerClick}>
                <TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />
            </div>
        )

        const closeButton = screen.getAllByTitle("Close Terminal")[0]
        fireEvent.click(closeButton)

        expect(onContainerClick).not.toHaveBeenCalled()
    })

    it("sets horizontal direction on desktop", () => {
        setMobile(false)
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        const group = screen.getByTestId("resizable-panel-group")
        expect(group).toHaveAttribute("data-panel-group-direction", "horizontal")
    })

    it("sets vertical direction on mobile", () => {
        setMobile(true)
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        const group = screen.getByTestId("resizable-panel-group")
        expect(group).toHaveAttribute("data-panel-group-direction", "vertical")
    })

    it("hides visual drag handles on mobile", () => {
        setMobile(true)
        render(<TerminalRow tabId="tab-1" terminals={mockTerminals} onRemove={mockOnRemove} />)

        const handleIndicators = screen.queryByRole("separator")?.querySelector("div")
        expect(handleIndicators).toBeNull()
    })
})

describe("TermTabs", () => {
    const mockOnTabChange = vi.fn()
    const mockOnAddTab = vi.fn()
    const mockOnAddSideBySide = vi.fn()
    const mockOnRemoveTerminal = vi.fn()

    const mockTabs = [
        {
            id: "tab-1",
            name: "Tab 1",
            terminals: [{ id: 1, name: "Term 1", content: <div>1</div> }]
        },
        {
            id: "tab-2",
            name: "Tab 2",
            terminals: [{ id: 2, name: "Term 2", content: <div>2</div> }]
        }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        setMobile(false)
    })

    it("triggers onTabChange when a tab header is clicked", () => {
        render(
            <TermTabs
                tabs={mockTabs}
                activeTabId="tab-1"
                onTabChange={mockOnTabChange}
                onAddTab={mockOnAddTab}
                onAddSideBySide={mockOnAddSideBySide}
                onRemoveTerminal={mockOnRemoveTerminal}
            />
        )

        // Click Tab 2 since Tab 1 is already active
        const tabTrigger = screen.getByText("Tab 2")
        fireEvent.click(tabTrigger)

        expect(mockOnTabChange).toHaveBeenCalledWith("tab-2", expect.anything())
    })

    it("calls onAddTab when 'New Tab' button is clicked", () => {
        render(
            <TermTabs
                tabs={mockTabs}
                activeTabId="tab-1"
                onTabChange={mockOnTabChange}
                onAddTab={mockOnAddTab}
                onAddSideBySide={mockOnAddSideBySide}
                onRemoveTerminal={mockOnRemoveTerminal}
            />
        )

        const addButton = screen.getByTitle("New Tab")
        fireEvent.click(addButton)

        expect(mockOnAddTab).toHaveBeenCalled()
    })

    it("calls onAddSideBySide when 'Side-by-side' button is clicked", () => {
        render(
            <TermTabs
                tabs={mockTabs}
                activeTabId="tab-1"
                onTabChange={mockOnTabChange}
                onAddTab={mockOnAddTab}
                onAddSideBySide={mockOnAddSideBySide}
                onRemoveTerminal={mockOnRemoveTerminal}
            />
        )

        const sideBySideButton = screen.getByTitle("Side-by-side")
        fireEvent.click(sideBySideButton)

        expect(mockOnAddSideBySide).toHaveBeenCalledWith("tab-1")
    })

    it("disables Side-by-side button when no tab is active", () => {
        render(
            <TermTabs
                tabs={mockTabs}
                activeTabId=""
                onTabChange={mockOnTabChange}
                onAddTab={mockOnAddTab}
                onAddSideBySide={mockOnAddSideBySide}
                onRemoveTerminal={mockOnRemoveTerminal}
            />
        )

        const button = screen.getByTitle("Side-by-side")
        expect(button).toBeDisabled()
    })
})
