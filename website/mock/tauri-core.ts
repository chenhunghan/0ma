import { emit } from "./tauri-event";
import {
  MOCK_INSTANCES,
  MOCK_LIMA_CONFIG,
  MOCK_K8S_CONFIG,
  MOCK_DISK_USAGE,
  MOCK_NETWORK_INTERFACES,
  MOCK_GUEST_DIAGNOSTICS,
  MOCK_GUEST_INFO,
  MOCK_SYSTEM_CAPABILITIES,
  MOCK_K8S_PODS,
  MOCK_K8S_SERVICES,
  MOCK_TERMINAL_OUTPUT,
  MOCK_KUBECTL_OUTPUT,
} from "./mock-data";
import type { LimaConfig } from "src/types/LimaConfig";

// Simulated delay to make UI feel realistic
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Track mutable state for the demo
let instances = [...MOCK_INSTANCES];

// Channel mock that mirrors @tauri-apps/api/core Channel
export class Channel<T = unknown> {
  id: number;
  onmessage: (message: T) => void = () => {};

  private static nextId = 0;

  constructor() {
    this.id = Channel.nextId++;
  }

  toJSON() {
    return `__CHANNEL__:${this.id}`;
  }
}

// Terminal replay state per session
const terminalReplays = new Map<string, ReturnType<typeof setTimeout>>();
const sessionReplayType = new Map<string, "docker" | "kubectl">();
let nextSessionId = 1;

function startTerminalReplay(channel: Channel<{ data: string }>, output: { delay: number; data: string }[]) {
  let i = 0;

  const scheduleNext = () => {
    if (i >= output.length) return; // Stop at the end

    const entry = output[i];
    i++;

    const timeout = setTimeout(() => {
      channel.onmessage({ data: entry.data });
      scheduleNext();
    }, entry.delay);

    terminalReplays.set(`timeout-${channel.id}-${i}`, timeout);
  };

  scheduleNext();
}


function simulateLifecycleEvents(
  operation: string,
  instanceName: string,
) {
  const prefix = `lima-instance-${operation}`;

  // Emit start event
  setTimeout(() => {
    emit(prefix, { instanceName });
  }, 50);

  // Emit stdout logs
  const logMessages = {
    create: ["Downloading image...", "Extracting image...", "Creating instance...", "Configuring VM..."],
    start: ["Starting VM...", "Waiting for SSH...", "Mounting directories...", "Ready"],
    stop: ["Sending shutdown signal...", "Waiting for VM to stop...", "Stopped"],
    delete: ["Stopping instance...", "Removing files...", "Cleaning up..."],
  };

  const messages = logMessages[operation as keyof typeof logMessages] ?? ["Processing..."];
  messages.forEach((msg, idx) => {
    setTimeout(() => {
      emit(`${prefix}-stdout`, { message: msg, instanceName });
    }, 200 + idx * 500);
  });

  // Emit success event
  setTimeout(() => {
    emit(`${prefix}-success`, { instanceName });
  }, 200 + messages.length * 500 + 300);
}

// The main invoke mock
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  await delay(50 + Math.random() * 100);

  switch (cmd) {
    // Instance management
    case "get_all_lima_instances_cmd":
      return [...instances] as T;

    case "create_lima_instance_cmd": {
      const name = args?.instanceName as string;
      const config = args?.config as LimaConfig;
      instances.push({
        name,
        status: "Running" as never,
        cpus: config.cpus ?? 4,
        memory: config.memory ?? "4GiB",
        disk: config.disk ?? "100GiB",
        arch: "aarch64",
        version: "1.0.0",
        dir: `/Users/demo/.lima/${name}`,
      });
      simulateLifecycleEvents("create", name);
      return "ok" as T;
    }

    case "start_lima_instance_cmd": {
      const name = args?.instanceName as string;
      const inst = instances.find((i) => i.name === name);
      if (inst) inst.status = "Running" as never;
      simulateLifecycleEvents("start", name);
      return "ok" as T;
    }

    case "stop_lima_instance_cmd": {
      const name = args?.instanceName as string;
      const inst = instances.find((i) => i.name === name);
      if (inst) inst.status = "Stopped" as never;
      simulateLifecycleEvents("stop", name);
      return "ok" as T;
    }

    case "delete_lima_instance_cmd": {
      const name = args?.instanceName as string;
      instances = instances.filter((i) => i.name !== name);
      simulateLifecycleEvents("delete", name);
      return "ok" as T;
    }

    case "is_instance_registered_cmd":
      return (instances.some((i) => i.name === args?.instanceName)) as T;

    // Instance properties
    case "get_instance_uptime_cmd":
      return "2d 14h 32m" as T;

    case "get_instance_disk_usage_cmd":
      return MOCK_DISK_USAGE as T;

    case "get_instance_ip_cmd":
      return MOCK_NETWORK_INTERFACES as T;

    case "get_instance_guest_info_cmd":
      return MOCK_GUEST_INFO as T;

    case "get_instance_guest_diagnostics_cmd":
      return MOCK_GUEST_DIAGNOSTICS as T;

    // System
    case "get_system_capabilities_cmd":
      return MOCK_SYSTEM_CAPABILITIES as T;

    case "lima_version_cmd":
      return "1.0.2" as T;

    // Config
    case "read_lima_yaml_cmd": {
      const name = args?.instanceName as string;
      if (name === "k8s-cluster") return { ...MOCK_K8S_CONFIG } as T;
      return { ...MOCK_LIMA_CONFIG } as T;
    }

    case "write_lima_yaml_cmd":
      return undefined as T;

    case "get_lima_yaml_path_cmd":
      return `/Users/demo/.lima/${args?.instanceName}/lima.yaml` as T;

    case "reset_lima_yaml_cmd": {
      const name = args?.instanceName as string;
      if (name === "k8s-cluster") return { ...MOCK_K8S_CONFIG } as T;
      return { ...MOCK_LIMA_CONFIG } as T;
    }

    case "get_default_docker_lima_config_yaml_cmd":
      return { ...MOCK_LIMA_CONFIG } as T;

    case "get_default_k0s_lima_config_yaml_cmd":
      return { ...MOCK_K8S_CONFIG } as T;

    // Environment
    case "check_env_sh_exists_cmd": {
      // Return false when ?autoEnvSetup is set so the env setup button appears
      const showEnvSetup = typeof window !== "undefined"
        && new URLSearchParams(window.location.search).has("autoEnvSetup");
      return (!showEnvSetup) as T;
    }

    case "write_env_sh_cmd":
      return `/Users/demo/.0ma/${args?.instanceName}/env.sh` as T;

    case "append_env_to_shell_profile_cmd":
      return "Added to ~/.zshrc" as T;

    case "detect_orphaned_env_entries_cmd":
      return [] as T;

    case "cleanup_orphaned_env_entries_cmd":
      return undefined as T;

    // Kubernetes
    case "check_k0s_available_cmd":
      return false as T;

    case "get_k8s_pods_cmd":
      return MOCK_K8S_PODS as T;

    case "get_k8s_services_cmd":
      return MOCK_K8S_SERVICES as T;

    // Terminal / PTY
    case "spawn_pty_cmd": {
      const sid = `mock-session-${nextSessionId++}`;
      const spawnArgs = args?.args as string[] | undefined;
      // Detect kubectl tab by checking if the instance name contains "k8s"
      const instanceHint = spawnArgs?.find((a) => a.includes("k8s"));
      sessionReplayType.set(sid, instanceHint ? "kubectl" : "docker");
      return sid as T;
    }

    case "attach_pty_cmd": {
      const channel = args?.channel as Channel<{ data: string }>;
      const sessionId = args?.sessionId as string;
      if (channel) {
        const replayType = sessionReplayType.get(sessionId);
        const output = replayType === "kubectl" ? MOCK_KUBECTL_OUTPUT : MOCK_TERMINAL_OUTPUT;
        startTerminalReplay(channel, output);
      }
      return undefined as T;
    }

    case "write_pty_cmd":
      return undefined as T;

    case "resize_pty_cmd":
      return undefined as T;

    case "close_pty_cmd": {
      // Clean up any replay timeouts
      for (const [key, timeout] of terminalReplays) {
        clearTimeout(timeout);
        terminalReplays.delete(key);
      }
      return undefined as T;
    }

    default:
      console.warn(`[mock] Unhandled invoke: ${cmd}`, args);
      return undefined as T;
  }
}

// Re-export types that components may import from @tauri-apps/api/core
export type InvokeArgs = Record<string, unknown>;
export type InvokeOptions = Record<string, unknown>;
