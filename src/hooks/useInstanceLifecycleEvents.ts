import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";

const LIFECYCLE_SUCCESS_EVENTS = [
  "lima-instance-create-success",
  "lima-instance-start-success",
  "lima-instance-stop-success",
  "lima-instance-delete-success",
];

/**
 * Global listener that invalidates the instances query whenever any
 * instance lifecycle operation completes — regardless of whether
 * it was triggered from the UI or the system tray.
 *
 * Mount once at the app root.
 */
export function useInstanceLifecycleEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlistenPromises = LIFECYCLE_SUCCESS_EVENTS.map((event) =>
      listen(event, () => {
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      }),
    );

    return () => {
      void Promise.allSettled(unlistenPromises).then((results) => {
        for (const result of results) {
          if (result.status === "fulfilled") {
            try {
              result.value();
            } catch {
              // already cleaned up
            }
          }
        }
      });
    };
  }, [queryClient]);
}
