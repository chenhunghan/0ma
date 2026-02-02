import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { MockService } from "../services/mockK8sData";

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
    ports?: Array<{
      name?: string;
      port: number;
      protocol?: string;
      targetPort?: number | string;
      nodePort?: number;
    }>;
    selector?: Record<string, string>;
    clusterIP?: string;
    externalIPs?: string[];
    type?: string;
  };
  status?: {
    loadBalancer?: {
      ingress?: Array<{
        ip?: string;
        hostname?: string;
      }>;
    };
  };
}

const fetchK8sServices = async (instanceName: string): Promise<K8sService[]> => {
  return await invoke("get_k8s_services_cmd", { instanceName });
};

// Calculate age from creationTimestamp
const calculateAge = (timestamp?: string): string => {
  if (!timestamp) return "Unknown";
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `${diffDays}d`;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) return `${diffHours}h`;

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes > 0) return `${diffMinutes}m`;

  return "Just now";
};

export const useK8sServices = (instanceName: string | undefined) => {
  return useQuery({
    queryKey: ["k8s-services", instanceName],
    queryFn: () => (instanceName ? fetchK8sServices(instanceName) : Promise.resolve([])),
    enabled: !!instanceName,
    select: (data): MockService[] => {
      return data.map((svc) => {
        return {
          id: svc.metadata.uid || svc.metadata.name,
          name: svc.metadata.name,
          namespace: svc.metadata.namespace,
          type: svc.spec?.type || "ClusterIP",
          clusterIP: svc.spec?.clusterIP || "None",
          externalIP:
            svc.status?.loadBalancer?.ingress?.[0]?.ip || svc.spec?.externalIPs?.[0] || "<none>",
          ports: (svc.spec?.ports || []).map((p) => ({
            name: p.name || "",
            port: p.port,
            targetPort:
              typeof p.targetPort === "string"
                ? parseInt(p.targetPort, 10) || 0
                : p.targetPort || 0,
            protocol: p.protocol || "TCP",
            nodePort: p.nodePort,
          })),
          selector: svc.spec?.selector || {},
          age: calculateAge(svc.metadata.creationTimestamp),
          status: "Active", // K8s services are usually active if they exist
        };
      });
    },
    refetchInterval: 5000,
  });
};
