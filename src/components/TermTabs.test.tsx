import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { TerminalRow, Terminal } from "./TermTabs"

describe("TerminalRow", () => {
    const mockTerminals: Terminal[] = [
        { id: 1, name: "Term 1", content: <div data-testid="content-1">Content 1</div> },
        { id: 2, name: "Term 2", content: <div data-testid="content-2">Content 2</div> },
    ]
    const mockOnRemove = vi.fn()

    it("renders all terminal contents", () => {
        render(
            <TerminalRow
                tabId="tab-1"
                terminals={mockTerminals}
                onRemove={mockOnRemove}
            />
        )

        expect(screen.getByTestId("content-1")).toBeInTheDocument()
        expect(screen.getByTestId("content-2")).toBeInTheDocument()
    })

    it("calls onRemove when close button is clicked", () => {
        render(
            <TerminalRow
                tabId="tab-1"
                terminals={mockTerminals}
                onRemove={mockOnRemove}
            />
        )

        // The close button is titled "Close Terminal"
        const closeButtons = screen.getAllByTitle("Close Terminal")
        fireEvent.click(closeButtons[0])

        expect(mockOnRemove).toHaveBeenCalledWith("tab-1", 1)
    })
})
