import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import * as log from "@tauri-apps/plugin-log";

async function checkForUpdates(userInitiated: boolean) {
  try {
    const update = await check();
    if (!update) {
      if (userInitiated) {
        await message("You are on the latest version.", {
          title: "No Updates Available",
          kind: "info",
        });
      }
      return;
    }

    const yes = await ask(
      `Version ${update.version} is available.\n\n${update.body ?? ""}`.trim(),
      { title: "Update Available", kind: "info", okLabel: "Update & Restart", cancelLabel: "Later" },
    );

    if (!yes) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    log.error(`Auto-update check failed: ${e}`);
    if (userInitiated) {
      await message(`Failed to check for updates: ${e}`, {
        title: "Update Error",
        kind: "error",
      });
    }
  }
}

export function useAutoUpdater() {
  // Check on launch (silent)
  useEffect(() => {
    checkForUpdates(false);
  }, []);

  // Listen for tray menu "Check for Updates…" click
  useEffect(() => {
    const unlisten = listen("check-for-updates", () => {
      checkForUpdates(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
