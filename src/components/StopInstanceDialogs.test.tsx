import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StopInstanceDialogs } from "./StopInstanceDialogs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InstanceStatus } from "src/types/InstanceStatus";

// --- Mocks ---

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args: unknown) => Promise.resolve(mockInvoke(cmd, args)),
}));

// Mock @tauri-apps/api/event
const { eventListeners } = vi.hoisted(() => ({
  eventListeners: {} as Record<string, ((event: unknown) => void)[]>,
}));

const mockListen = vi.fn((event: string, handler: (event: unknown) => void) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(handler);
  return Promise.resolve(() => {
    eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
  });
});

vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, handler: (event: unknown) => void) => mockListen(event, handler),
}));

// Helper to simulate events
const emitEvent = (eventName: string, payload: unknown) => {
  const listeners = eventListeners[eventName];
  if (listeners) {
    listeners.forEach((handler) => handler({ payload }));
  }
};

// Mock useSelectedInstance
const mockUseSelectedInstance = vi.fn();
vi.mock("src/hooks/useSelectedInstance", () => ({
  useSelectedInstance: () => mockUseSelectedInstance(),
}));

// Mock useLimaInstance
const mockStopInstance = vi.fn();
const mockStartInstance = vi.fn();
vi.mock("src/hooks/useLimaInstance", () => ({
  useLimaInstance: () => ({
    startInstance: mockStartInstance,
    stopInstance: mockStopInstance,
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// --- Test Setup ---

const createTestQueryClient = () =>
  new QueryClient({
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

  const renderComponent = (selectedInstanceOverride?: { status?: string; name?: string }) => {
    mockUseSelectedInstance.mockReturnValue({
      isLoading: false,
      selectedInstance: selectedInstanceOverride || { status: InstanceStatus.Running },
      selectedName: selectedInstanceOverride?.name || "test-instance",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StopInstanceDialogs onEnvSetup={() => {}} />
      </QueryClientProvider>,
    );
  };

  it("shows Start button if instance is stopped", () => {
    mockUseSelectedInstance.mockReturnValue({
      isLoading: false,
      selectedInstance: { status: InstanceStatus.Stopped },
      selectedName: "test-instance",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StopInstanceDialogs onEnvSetup={() => {}} />
      </QueryClientProvider>,
    );

    const startButton = screen.getByLabelText("Start Lima instance");
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();

    expect(screen.queryByLabelText("Stop Lima instance")).not.toBeInTheDocument();
  });

  it("disables stop button if instance status is unknown", () => {
    mockUseSelectedInstance.mockReturnValue({
      selectedInstance: { status: "Unknown" }, // Or undefined status
      selectedName: "test-instance",
      isLoading: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StopInstanceDialogs onEnvSetup={() => {}} />
      </QueryClientProvider>,
    );

    const stopButton = screen.getByLabelText("Stop Lima instance");
    expect(stopButton).toBeDisabled();
  });

  it("enables stop button if instance is running", () => {
    renderComponent();
    const stopButton = screen.getByLabelText("Stop Lima instance");
    expect(stopButton).not.toBeDisabled();
  });

  it("shows confirmation dialog on Stop click and cancels", async () => {
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

  it("proceeds to stop and shows logs dialog", async () => {
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
        timestamp: new Date().toISOString(),
      });
      emitEvent("lima-instance-stop-stdout", {
        instance_name: "test-instance",
        message: "Gracefully shutting down...",
        message_id: "2",
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      });
    });

    // 6. Verify dialog auto-closes on success
    await waitFor(() => {
      expect(screen.queryByText("Stopping Instance...")).not.toBeInTheDocument();
      expect(screen.queryByText("Instance Stopped")).not.toBeInTheDocument();
    });
  }, 30_000);

  it("proceeds to Start flow for stopped instance", async () => {
    mockUseSelectedInstance.mockReturnValue({
      isLoading: false,
      selectedInstance: { status: InstanceStatus.Stopped },
      selectedName: "test-instance",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StopInstanceDialogs onEnvSetup={() => {}} />
      </QueryClientProvider>,
    );

    // 1. Click Start
    const startButton = screen.getByLabelText("Start Lima instance");
    fireEvent.click(startButton);

    // 2. Verify Start Confirmation Dialog (variant="stopped")
    // "Start Instance" title
    expect(screen.getByRole("heading", { name: "Start Instance" })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to start instance/)).toBeInTheDocument();

    // 3. Confirm Start
    const confirmStartButton = screen.getByRole("button", { name: "Start" });
    fireEvent.click(confirmStartButton);

    await waitFor(() => {
      expect(mockStartInstance).toHaveBeenCalledWith("test-instance");
    });

    // 4. Verify Starting Logs Dialog
    await waitFor(() => {
      expect(screen.getByText("Starting Instance...")).toBeInTheDocument();
    });

    // 5. Simulate Start Logs
    act(() => {
      emitEvent("lima-instance-start", {
        instance_name: "test-instance",
        message: "Starting...",
        message_id: "s1",
        timestamp: new Date().toISOString(),
      });
      emitEvent("lima-instance-start-stdout", {
        instance_name: "test-instance",
        message: "Booting...",
        message_id: "s2",
        timestamp: new Date().toISOString(),
      });
    });
  });
});
