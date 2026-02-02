import type { Log } from "src/types/Log";

export const insertLog = (logs: Log[], newLog: Log): Log[] => {
  // If empty or newLog is newer/equal to the last one, append.
  if (logs.length === 0 || newLog.timestamp >= logs[logs.length - 1].timestamp) {
    return [...logs, newLog];
  }

  // Find insertion index (first log that is newer than newLog)
  const index = logs.findIndex((log) => log.timestamp > newLog.timestamp);

  // This shouldn't happen given the first check, but for safety:
  if (index === -1) {
    return [...logs, newLog];
  }

  const newLogs = [...logs];
  newLogs.splice(index, 0, newLog);
  return newLogs;
};
