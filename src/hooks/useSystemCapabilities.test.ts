import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// Mock invoke with different system capability scenarios
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string) => mockInvoke(cmd),
}));

// Must import AFTER mocks are set up
const { useSystemCapabilities } = await import("./useSystemCapabilities");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSystemCapabilities", () => {
  it("reports krunkit as supported when all requirements are met", async () => {
    mockInvoke.mockResolvedValue({
      arch: "aarch64",
      macosVersion: "15.1",
      krunkitAvailable: true,
      krunkitDriverAvailable: true,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(true);
    expect(result.current.krunkitMissingReasons).toHaveLength(0);
  });

  it("reports krunkit as unsupported on x86_64", async () => {
    mockInvoke.mockResolvedValue({
      arch: "x86_64",
      macosVersion: "15.1",
      krunkitAvailable: true,
      krunkitDriverAvailable: true,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(false);
    expect(result.current.krunkitMissingReasons).toContain("Apple Silicon required");
  });

  it("reports krunkit as unsupported on macOS < 14", async () => {
    mockInvoke.mockResolvedValue({
      arch: "aarch64",
      macosVersion: "13.6",
      krunkitAvailable: true,
      krunkitDriverAvailable: true,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(false);
    expect(result.current.krunkitMissingReasons).toContain("macOS 14+ required");
  });

  it("reports missing krunkit binary", async () => {
    mockInvoke.mockResolvedValue({
      arch: "aarch64",
      macosVersion: "15.1",
      krunkitAvailable: false,
      krunkitDriverAvailable: true,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(false);
    expect(result.current.krunkitMissingReasons).toEqual(
      expect.arrayContaining([expect.stringContaining("krunkit not installed")]),
    );
  });

  it("reports missing Lima krunkit driver", async () => {
    mockInvoke.mockResolvedValue({
      arch: "aarch64",
      macosVersion: "15.1",
      krunkitAvailable: true,
      krunkitDriverAvailable: false,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(false);
    expect(result.current.krunkitMissingReasons).toContain("Lima krunkit driver not found");
  });

  it("reports multiple missing reasons", async () => {
    mockInvoke.mockResolvedValue({
      arch: "x86_64",
      macosVersion: "13.0",
      krunkitAvailable: false,
      krunkitDriverAvailable: false,
    });

    const { result } = renderHook(() => useSystemCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.capabilities).toBeDefined());

    expect(result.current.isKrunkitSupported).toBe(false);
    expect(result.current.krunkitMissingReasons).toHaveLength(4);
  });
});
