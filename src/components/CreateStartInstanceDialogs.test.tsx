import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateStartInstanceDialogs } from "./CreateStartInstanceDialogs";
import type { LimaConfig } from "src/types/LimaConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args: unknown) => {
    // Return a mock instance so the auto-open create dialog doesn't trigger
    if (cmd === "get_all_lima_instances_cmd") {
      return Promise.resolve([{ name: "existing-instance", status: "Running" }]);
    }
    return Promise.resolve(mockInvoke(cmd, args));
  },
}));

// Mock @tauri-apps/api/event
// We need a way to trigger events from within our tests.
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

// Mock useLayoutStorage
const mockSetActiveTab = vi.fn();
vi.mock("src/hooks/useLayoutStorage", () => ({
  useLayoutStorage: () => ({
    setActiveTab: mockSetActiveTab,
  }),
}));

// Mock useCreateLimaInstanceDraft
const mockDraftConfig: LimaConfig = {
  arch: "aarch64",
  audio: { device: "coreaudio" },
  caCerts: { certs: [], files: [], removeDefaults: false },
  containerd: { system: false, user: false },
  cpus: 4,
  disk: "100GiB",
  env: {},
  firmware: { legacyBIOS: false },
  hostResolver: { enabled: true, hosts: {}, ipv6: false },
  images: [{ arch: "aarch64", location: "https://example.com/image.img" }],
  memory: "4GiB",
  message: "",
  mounts: [],
  networks: [],
  os: "Linux",
  portForwards: [],
  probes: [],
  propagateProxyEnv: false,
  rosetta: { bin: true, enabled: false },
  ssh: { forwardAgent: false, loadDotSSHPubKeys: true, localPort: 60_022 },
  video: { display: "cocoa" },
};

const mockUseCreateLimaInstanceDraft = vi.fn(() => ({
  draftConfig: mockDraftConfig,
  instanceName: "test-instance",
}));

vi.mock("src/hooks/useCreateLimaInstanceDraft", () => ({
  useCreateLimaInstanceDraft: () => mockUseCreateLimaInstanceDraft(),
}));

// Mock ResizeObserver (needed for some UI components likely)
// Mock ResizeObserver (needed for some UI components likely)
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

describe("CreateStartInstanceDialogs", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear listeners manually since it's a hoisted object
    for (const key in eventListeners) {
      delete eventListeners[key];
    }
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateStartInstanceDialogs onEnvSetup={() => {}} />
      </QueryClientProvider>,
    );
  };

  const openCreateAndSubmit = () => {
    const createButton = screen.getByLabelText("Create new Lima instance");
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(screen.getByText("Create Instance")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
  };

  const expectCreateCommandAndDialog = async () => {
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("create_lima_instance_cmd", {
        config: mockDraftConfig,
        instanceName: "test-instance",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Creating Instance")).toBeInTheDocument();
    });
  };

  const emitCreateLogsAndVerify = async () => {
    act(() => {
      emitEvent("lima-instance-create", {
        instance_name: "test-instance",
        message: "Starting creation...",
        message_id: "1",
        timestamp: new Date().toISOString(),
      });
      emitEvent("lima-instance-create-stdout", {
        instance_name: "test-instance",
        message: "Downloading image...",
        message_id: "2",
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Downloading image...")).toBeInTheDocument();
    });
  };

  const completeCreateAndStart = async () => {
    act(() => {
      emitEvent("lima-instance-create-success", {
        instance_name: "test-instance",
        message: "Created successfully",
        message_id: "3",
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Instance Created")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("start_lima_instance_cmd", {
        instanceName: "test-instance",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Starting Instance...")).toBeInTheDocument();
    });
  };

  const emitStartLogsAndVerify = async () => {
    act(() => {
      emitEvent("lima-instance-start", {
        instance_name: "test-instance",
        message: "Starting...",
        message_id: "4",
        timestamp: new Date().toISOString(),
      });
      emitEvent("lima-instance-start-stdout", {
        instance_name: "test-instance",
        message: "Booting kernel...",
        message_id: "5",
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Booting kernel...")).toBeInTheDocument();
    });
  };

  const completeStartAndVerify = async () => {
    act(() => {
      emitEvent("lima-instance-start-success", {
        instance_name: "test-instance",
        message: "Started successfully",
        message_id: "6",
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(mockSetActiveTab).toHaveBeenCalledWith("lima");
      expect(screen.queryByText("Starting Instance...")).not.toBeInTheDocument();
      expect(screen.queryByText("Instance Started")).not.toBeInTheDocument();
    });
  };

  it("successfully (happy flow) creates and starts an instance, showing logs and switching tabs", async () => {
    renderComponent();
    openCreateAndSubmit();
    await expectCreateCommandAndDialog();
    await emitCreateLogsAndVerify();
    await completeCreateAndStart();
    await emitStartLogsAndVerify();
    await completeStartAndVerify();
  }, 30_000);

  it("handles creation failure gracefully", async () => {
    renderComponent();

    // 1. Open Create Dialog
    fireEvent.click(screen.getByLabelText("Create new Lima instance"));

    // 2. Click Create
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    // 3. Verify Creating Logs Dialog appears
    await waitFor(() => {
      expect(screen.getByText("Creating Instance")).toBeInTheDocument();
    });

    // 4. Simulate Error
    act(() => {
      emitEvent("lima-instance-create-error", {
        instance_name: "test-instance",
        message: "Creation failed due to disk error",
        message_id: "err1",
        timestamp: new Date().toISOString(),
      });
    });

    // 5. Verify Error Message and State
    // Ensure we are NOT in Start Instance dialog
    await waitFor(() => {
      expect(screen.queryByText("Instance Created")).not.toBeInTheDocument();
    });

    // And Creating Instance dialog is still there
    expect(screen.getByText("Creating Instance")).toBeInTheDocument();
  });

  it("handles start failure gracefully", async () => {
    renderComponent();

    // 1. Create
    fireEvent.click(screen.getByLabelText("Create new Lima instance"));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByText("Creating Instance")).toBeInTheDocument());

    // 2. Success Create
    act(() => {
      emitEvent("lima-instance-create-success", {
        instance_name: "test-instance",
        message: "Created",
        message_id: "s1",
        timestamp: new Date().toISOString(),
      });
    });

    // 3. Start Dialog
    await waitFor(() => expect(screen.getByText("Instance Created")).toBeInTheDocument());

    // 4. Start
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("start_lima_instance_cmd", {
        instanceName: "test-instance",
      });
    });

    // 5. Starting Dialog
    await waitFor(() => expect(screen.getByText("Starting Instance...")).toBeInTheDocument());

    // 6. Simulate Start Error
    act(() => {
      emitEvent("lima-instance-start-error", {
        instance_name: "test-instance",
        message: "Failed to boot",
        message_id: "err2",
        timestamp: new Date().toISOString(),
      });
    });

    // 7. Verify Error
    // Should NOT switch tab
    expect(mockSetActiveTab).not.toHaveBeenCalled();

    // Should NOT show "Instance Started"
    expect(screen.queryByText("Instance Started")).not.toBeInTheDocument();
  }, 30_000);
});
