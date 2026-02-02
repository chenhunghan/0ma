import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { MockService } from "../services/mockK8sData";

// Types matching Rust backend structs
interface K8sService {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
    creationTimestamp?: string;
    labels: Record<string, string>;
  };
  spec?: {
    ports?: {
      name?: string;
      port: number;
      protocol?: string;
      targetPort?: number | string;
      nodePort?: number;
    }[];
    selector?: Record<string, string>;
    clusterIP?: string;
    externalIPs?: string[];
    type?: string;
  };
  status?: {
    loadBalancer?: {
      ingress?: {
        ip?: string;
        hostname?: string;
      }[];
    };
  };
}

const fetchK8sServices = async (instanceName: string): Promise<K8sService[]> => await invoke("get_k8s_services_cmd", { instanceName });

// Calculate age from creationTimestamp
const calculateAge = (timestamp?: string): string => {
  if (!timestamp) {return "Unknown";}
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {return `${diffDays}d`;}

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) {return `${diffHours}h`;}

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes > 0) {return `${diffMinutes}m`;}

  return "Just now";
};

export const useK8sServices = (instanceName: string | undefined) => useQuery({
    enabled: Boolean(instanceName),
    queryFn: () => (instanceName ? fetchK8sServices(instanceName) : Promise.resolve([])),
    queryKey: ["k8s-services", instanceName],
    refetchInterval: 5000,
    select: (data): MockService[] => data.map((svc) => ({
          age: calculateAge(svc.metadata.creationTimestamp),
          clusterIP: svc.spec?.clusterIP || "None",
          externalIP:
            svc.status?.loadBalancer?.ingress?.[0]?.ip || svc.spec?.externalIPs?.[0] || "<none>",
          id: svc.metadata.uid || svc.metadata.name,
          name: svc.metadata.name,
          namespace: svc.metadata.namespace,
          ports: (svc.spec?.ports || []).map((p) => ({
            name: p.name || "",
            nodePort: p.nodePort,
            port: p.port,
            protocol: p.protocol || "TCP",
            targetPort:
              typeof p.targetPort === "string"
                ? parseInt(p.targetPort, 10) || 0
                : p.targetPort || 0,
          })),
          selector: svc.spec?.selector || {},
          status: "Active",
          type: svc.spec?.type || "ClusterIP", // K8s services are usually active if they exist
        })),
  });
