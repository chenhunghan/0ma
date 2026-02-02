export interface Log {
  id: string;
  message: string;
  timestamp: string; // Nano-timestamp from backend
}

export interface LogState {
  stdout: Log[];
  stderr: Log[];
  error: Log[];
  isLoading: boolean;
  isSuccess?: boolean;
}
