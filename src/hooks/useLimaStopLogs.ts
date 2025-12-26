import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";

export interface LogEntry {
  type: "info" | "stdout" | "stderr" | "error" | "success";
  message: string;
  timestamp: Date;
}

export function useLimaStopLogs(
  onSuccess?: (instanceName: string) => void,
  onError?: (error: string) => void
) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const setupListeners = async () => {
      // Listen for stop initialization
      const unlistenStop = await listen<string>("lima-instance-stop", (event) => {
        setIsStopping(true);
        setError(null);
        setLogs([{ type: "info", message: event.payload, timestamp: new Date() }]);
      });

      // Listen for stdout
      const unlistenStdout = await listen<string>("lima-instance-stop-stdout", (event) => {
        setLogs((prev) => [...prev, { type: "stdout", message: event.payload, timestamp: new Date() }]);
      });

      // Listen for stderr
      const unlistenStderr = await listen<string>("lima-instance-stop-stderr", (event) => {
        setLogs((prev) => [...prev, { type: "stderr", message: event.payload, timestamp: new Date() }]);
      });

      // Listen for success
      const unlistenSuccess = await listen<string>("lima-instance-stop-success", (event) => {
        setLogs((prev) => [...prev, { type: "success", message: event.payload, timestamp: new Date() }]);
        setIsStopping(false);
        
        // Invalidate instances query to refresh the status immediately
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        
        // Extract instance name from success message
        const match = event.payload.match(/Lima instance '([^']+)' stopped successfully!/);
        const instanceName = match ? match[1] : '';
        
        if (onSuccess) {
          onSuccess(instanceName);
        }
      });

      // Listen for errors
      const unlistenError = await listen<string>("lima-instance-stop-error", (event) => {
        setLogs((prev) => [...prev, { type: "error", message: event.payload, timestamp: new Date() }]);
        setError(event.payload);
        setIsStopping(false);
        
        // Invalidate to ensure UI reflects actual state even on error
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        
        if (onError) {
          onError(event.payload);
        }
      });

      return () => {
        unlistenStop();
        unlistenStdout();
        unlistenStderr();
        unlistenSuccess();
        unlistenError();
      };
    };

    const cleanup = setupListeners();
    return () => {
      cleanup.then((fn) => fn());
    };
  }, [onSuccess, onError]);

  return {
    logs,
    isStopping,
    error,
  };
}
