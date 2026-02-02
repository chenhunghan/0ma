export interface K8sInfo {
  version: string;
  nodes: number;
  pods: number;
  services: number;
  status: "Ready" | "NotReady" | "Unknown";
}
