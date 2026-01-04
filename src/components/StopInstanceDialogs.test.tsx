
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StopInstanceDialogs } from "./StopInstanceDialogs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InstanceStatus } from "src/types/InstanceStatus";

// --- Mocks ---

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
    invoke: (cmd: string, args: any) => Promise.resolve(mockInvoke(cmd, args)),
}));

// Mock @tauri-apps/api/event
const { eventListeners } = vi.hoisted(() => ({
    eventListeners: {} as Record<string, ((event: any) => void)[]>
}));

const mockListen = vi.fn((event: string, handler: (event: any) => void) => {
    if (!eventListeners[event]) {
        eventListeners[event] = [];
    }
    eventListeners[event].push(handler);
    return Promise.resolve(() => {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler);
    });
});

vi.mock("@tauri-apps/api/event", () => ({
    listen: (event: string, handler: (event: any) => void) => mockListen(event, handler),
}));

// Helper to simulate events
const emitEvent = (eventName: string, payload: any) => {
    const listeners = eventListeners[eventName];
    if (listeners) {
        listeners.forEach(handler => handler({ payload }));
    }
};

// Mock useSelectedInstance
const mockUseSelectedInstance = vi.fn();
vi.mock("src/hooks/useSelectedInstance", () => ({
    useSelectedInstance: () => mockUseSelectedInstance(),
}));

// Mock useLimaInstance
const mockStopInstance = vi.fn();
vi.mock("src/hooks/useLimaInstance", () => ({
    useLimaInstance: () => ({
        stopInstance: mockStopInstance,
    }),
}));


// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// --- Test Setup ---

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe("StopInstanceDialogs", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear listeners
        for (const key in eventListeners) {
            delete eventListeners[key];
        }
        queryClient = createTestQueryClient();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderComponent = (selectedInstanceOverride?: any) => {
        mockUseSelectedInstance.mockReturnValue({
            selectedInstance: selectedInstanceOverride || { status: InstanceStatus.Running },
            selectedName: selectedInstanceOverride?.name || "test-instance",
            isLoading: false,
        });

        render(
            <QueryClientProvider client={queryClient}>
                <StopInstanceDialogs />
            </QueryClientProvider>
        );
    };

    it("Disables stop button if instance is not running", () => {
        mockUseSelectedInstance.mockReturnValue({
            selectedInstance: { status: InstanceStatus.Stopped },
            selectedName: "test-instance",
            isLoading: false,
        });

        render(
            <QueryClientProvider client={queryClient}>
                <StopInstanceDialogs />
            </QueryClientProvider>
        );

        const stopButton = screen.getByLabelText("Stop Lima instance");
        expect(stopButton).toBeDisabled();
    });

    it("Enables stop button if instance is running", () => {
        renderComponent();
        const stopButton = screen.getByLabelText("Stop Lima instance");
        expect(stopButton).not.toBeDisabled();
    });

    it("Shows confirmation dialog on click and cancels", async () => {
        renderComponent();
        const stopButton = screen.getByLabelText("Stop Lima instance");
        fireEvent.click(stopButton);

        expect(screen.getByRole("heading", { name: "Stop Instance" })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to stop instance/)).toBeInTheDocument();

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        await waitFor(() => {
            expect(screen.queryByText("Are you sure you want to stop instance")).not.toBeInTheDocument();
        });
        expect(mockStopInstance).not.toHaveBeenCalled();
    });

    it("Proceeds to stop and shows logs dialog", async () => {
        renderComponent();

        // 1. Open Dialog
        fireEvent.click(screen.getByLabelText("Stop Lima instance"));

        // 2. Confirm Stop
        const confirmButton = screen.getByRole("button", { name: "Stop Instance" });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(mockStopInstance).toHaveBeenCalledWith("test-instance");
        });

        // 3. Verify Stopping Logs Dialog
        await waitFor(() => {
            expect(screen.getByText("Stopping Instance...")).toBeInTheDocument();
        });

        // 4. Simulate Logs
        act(() => {
            emitEvent("lima-instance-stop", {
                instance_name: "test-instance",
                message: "Stopping...",
                message_id: "1",
                timestamp: new Date().toISOString()
            });
            emitEvent("lima-instance-stop-stdout", {
                instance_name: "test-instance",
                message: "Gracefully shutting down...",
                message_id: "2",
                timestamp: new Date().toISOString()
            });
        });

        await waitFor(() => {
            expect(screen.getByText("Gracefully shutting down...")).toBeInTheDocument();
        });

        // 5. Success
        act(() => {
            emitEvent("lima-instance-stop-success", {
                instance_name: "test-instance",
                message: "Stopped",
                message_id: "3",
                timestamp: new Date().toISOString()
            });
        });

        // 6. Verify Success State
        await waitFor(() => {
            expect(screen.getByText("Instance Stopped")).toBeInTheDocument();
            expect(screen.getByText("Done")).toBeInTheDocument();
        });
    });
});
