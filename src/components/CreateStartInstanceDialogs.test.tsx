
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CreateStartInstanceDialogs } from "./CreateStartInstanceDialogs";
import { LimaConfig } from "src/types/LimaConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
    invoke: (cmd: string, args: any) => Promise.resolve(mockInvoke(cmd, args)),
}));

// Mock @tauri-apps/api/event
// We need a way to trigger events from within our tests.
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
    images: [{ location: "https://example.com/image.img", arch: "aarch64" }],
    cpus: 4,
    memory: "4GiB",
    disk: "100GiB",
    mounts: [],
    networks: [],
    env: {},
    portForwards: [],
    message: "",
    probes: [],
    ssh: { localPort: 60022, loadDotSSHPubKeys: true, forwardAgent: false },
    firmware: { legacyBIOS: false },
    video: { display: "cocoa" },
    audio: { device: "coreaudio" },
    hostResolver: { enabled: true, ipv6: false, hosts: {} },
    propagateProxyEnv: false,
    caCerts: { removeDefaults: false, files: [], certs: [] },
    containerd: { system: false, user: false },
    os: "Linux",
    rosetta: { enabled: false, bin: true }
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
                <CreateStartInstanceDialogs />
            </QueryClientProvider>
        );
    };

    it("Successfully (happy flow) creates and starts an instance, showing logs and switching tabs", async () => {
        renderComponent();

        const createButton = screen.getByLabelText("Create new Lima instance");
        expect(createButton).toBeInTheDocument();

        // 1. Open Create Dialog
        fireEvent.click(createButton);
        expect(screen.getByText("Create Instance")).toBeInTheDocument(); // Title

        // 2. Click Create
        const createConfirmButton = screen.getByRole("button", { name: "Create" });
        fireEvent.click(createConfirmButton);

        // Verify create command was called
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("create_lima_instance_cmd", {
                config: mockDraftConfig,
                instanceName: "test-instance",
            });
        });

        // 3. Verify Creating Logs Dialog appears
        await waitFor(() => {
            expect(screen.getByText("Creating Instance")).toBeInTheDocument();
        });

        // Simulate creating logs
        act(() => {
            emitEvent("lima-instance-create", {
                instance_name: "test-instance",
                message: "Starting creation...",
                message_id: "1",
                timestamp: new Date().toISOString()
            });
            emitEvent("lima-instance-create-stdout", {
                instance_name: "test-instance",
                message: "Downloading image...",
                message_id: "2",
                timestamp: new Date().toISOString()
            });
        });

        // Verify logs are displayed
        await waitFor(() => {
            expect(screen.getByText("Downloading image...")).toBeInTheDocument();
        });

        // 4. Simulate Success
        act(() => {
            emitEvent("lima-instance-create-success", {
                instance_name: "test-instance",
                message: "Created successfully",
                message_id: "3",
                timestamp: new Date().toISOString()
            });
        });

        // 5. Verify transition to Start Dialog
        await waitFor(() => {
            // "Creating Instance" should disappear (or be replaced)
            // StartInstanceDialog title is "Instance Created"
            expect(screen.getByText("Instance Created")).toBeInTheDocument();
            // Button is "Start Instance"
            expect(screen.getByRole("button", { name: "Start Instance" })).toBeInTheDocument();
        });

        // 6. Click Start
        const startButton = screen.getByRole("button", { name: "Start Instance" });
        fireEvent.click(startButton);

        // Verify start command called
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("start_lima_instance_cmd", {
                instanceName: "test-instance"
            });
        });

        // 7. Verify Starting Logs Dialog appears
        await waitFor(() => {
            expect(screen.getByText("Starting Instance...")).toBeInTheDocument();
        });

        // Simulate starting logs
        act(() => {
            emitEvent("lima-instance-start", {
                instance_name: "test-instance",
                message: "Starting...",
                message_id: "4",
                timestamp: new Date().toISOString()
            });
            emitEvent("lima-instance-start-stdout", {
                instance_name: "test-instance",
                message: "Booting kernel...",
                message_id: "5",
                timestamp: new Date().toISOString()
            });
        });

        await waitFor(() => {
            expect(screen.getByText("Booting kernel...")).toBeInTheDocument();
        });

        // 8. Simulate Start Success/Ready
        act(() => {
            emitEvent("lima-instance-start-success", {
                instance_name: "test-instance",
                message: "Started successfully",
                message_id: "6",
                timestamp: new Date().toISOString()
            });
        });

        // 9. Verify success state and tab switch
        await waitFor(() => {
            expect(screen.getByText("Instance Started")).toBeInTheDocument();
        });

        // Check for "Done" button which appears on success
        const doneButton = screen.getByText("Done");
        expect(doneButton).toBeInTheDocument();

        // Closing the dialog should trigger tab switch
        fireEvent.click(doneButton);

        expect(mockSetActiveTab).toHaveBeenCalledWith("lima");
    });

    it("Handles creation failure gracefully", async () => {
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
                timestamp: new Date().toISOString()
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

    it("Handles start failure gracefully", async () => {
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
                timestamp: new Date().toISOString()
            });
        });

        // 3. Start Dialog
        await waitFor(() => expect(screen.getByText("Instance Created")).toBeInTheDocument());

        // 4. Start
        fireEvent.click(screen.getByRole("button", { name: "Start Instance" }));

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("start_lima_instance_cmd", {
                instanceName: "test-instance"
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
                timestamp: new Date().toISOString()
            });
        });

        // 7. Verify Error
        // Should NOT switch tab
        expect(mockSetActiveTab).not.toHaveBeenCalled();

        // Should NOT show "Instance Started"
        expect(screen.queryByText("Instance Started")).not.toBeInTheDocument();
    });
});
