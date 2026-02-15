import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyResetDraftDialogs } from "./ApplyResetDraftDialogs";
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

// Mock useUpdateLimaInstanceDraft
const mockApplyDraft = vi.fn();
const mockApplyDraftAsync = vi.fn().mockResolvedValue(undefined);
const mockResetDraft = vi.fn();
const mockUseUpdateLimaInstanceDraft = vi.fn();
vi.mock("src/hooks/useUpdateLimaInstanceDraft", () => ({
  useUpdateLimaInstanceDraft: () => mockUseUpdateLimaInstanceDraft(),
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

const defaultDraftMock = {
  actualConfig: { cpus: 4 },
  applyDraft: mockApplyDraft,
  applyDraftAsync: mockApplyDraftAsync,
  applyError: null,
  draftConfig: { cpus: 4 },
  isApplying: false,
  isDirty: false,
  isLoading: false,
  resetDraft: mockResetDraft,
  updateDraftConfig: vi.fn(),
  updateField: vi.fn(),
};

describe("ApplyResetDraftDialogs", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in eventListeners) {
      delete eventListeners[key];
    }
    queryClient = createTestQueryClient();
    mockUseUpdateLimaInstanceDraft.mockReturnValue(defaultDraftMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (options?: {
    instanceStatus?: string;
    instanceName?: string;
    isDirty?: boolean;
  }) => {
    const status = options?.instanceStatus ?? InstanceStatus.Running;
    const name = options?.instanceName ?? "test-instance";
    const isDirty = options?.isDirty ?? false;

    mockUseSelectedInstance.mockReturnValue({
      isLoading: false,
      selectedInstance: { status },
      selectedName: name,
    });

    mockUseUpdateLimaInstanceDraft.mockReturnValue({
      ...defaultDraftMock,
      isDirty,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ApplyResetDraftDialogs />
      </QueryClientProvider>,
    );
  };

  it("disables Apply button when not dirty", () => {
    renderComponent({ isDirty: false });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    expect(applyButton).toBeDisabled();
  });

  it("disables Reset button when not dirty", () => {
    renderComponent({ isDirty: false });
    const resetButton = screen.getByLabelText("Reset configuration changes");
    expect(resetButton).toBeDisabled();
  });

  it("enables Apply button when dirty and instance is Stopped", () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Stopped });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    expect(applyButton).not.toBeDisabled();
  });

  it("enables Apply button when dirty and instance is Running", () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Running });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    expect(applyButton).not.toBeDisabled();
  });

  it("enables Reset button when dirty", () => {
    renderComponent({ isDirty: true });
    const resetButton = screen.getByLabelText("Reset configuration changes");
    expect(resetButton).not.toBeDisabled();
  });

  it("disables Apply button when instance is in transitional state", () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Starting });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    expect(applyButton).toBeDisabled();
  });

  it("calls applyDraft directly when instance is Stopped", () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Stopped });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    fireEvent.click(applyButton);

    expect(mockApplyDraft).toHaveBeenCalled();
  });

  it("opens confirmation dialog when instance is Running", () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Running });
    const applyButton = screen.getByLabelText("Apply configuration changes");
    fireEvent.click(applyButton);

    expect(
      screen.getByRole("heading", { name: "Apply Configuration Changes" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/requires restarting the instance/)).toBeInTheDocument();
  });

  it("cancels confirmation dialog without triggering apply", async () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Running });
    fireEvent.click(screen.getByLabelText("Apply configuration changes"));

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/requires restarting the instance/)).not.toBeInTheDocument();
    });
    expect(mockStopInstance).not.toHaveBeenCalled();
  });

  it("confirms and triggers stop on Apply & Restart", async () => {
    renderComponent({ isDirty: true, instanceStatus: InstanceStatus.Running });
    fireEvent.click(screen.getByLabelText("Apply configuration changes"));

    const confirmButton = screen.getByRole("button", { name: "Apply & Restart" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockStopInstance).toHaveBeenCalledWith("test-instance");
    });
  });

  it("calls resetDraft when Reset is clicked", () => {
    renderComponent({ isDirty: true });
    const resetButton = screen.getByLabelText("Reset configuration changes");
    fireEvent.click(resetButton);

    expect(mockResetDraft).toHaveBeenCalled();
  });
});
