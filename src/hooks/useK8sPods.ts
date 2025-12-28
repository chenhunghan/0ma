import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface PodMetadata {
    name: string;
    namespace: string;
    uid?: string;
    creationTimestamp?: string;
    labels: Record<string, string>;
}

export interface PodStatus {
    phase?: string;
    hostIP?: string;
    podIP?: string;
    startTime?: string;
}

export interface PodSpec {
    nodeName?: string;
    containers?: Container[];
}

export interface Container {
    name: string;
    env?: EnvVar[];
}

export interface EnvVar {
    name: string;
    value?: string;
    valueFrom?: {
        configMapKeyRef?: {
            name?: string;
            key?: string;
        };
        secretKeyRef?: {
            name?: string;
            key?: string;
        };
    };
}

export interface Pod {
    metadata: PodMetadata;
    spec?: PodSpec;
    status?: PodStatus;
}

// Helper to convert real Pod to MockPod structure used by UI
export interface UIPod {
    id: string;
    name: string;
    namespace: string;
    status: string;
    node: string;
    ip: string;
    age: string;
    labels: Record<string, string>;
    env: Array<{ name: string; value: string; source: string }>;
}

const fetchK8sPods = async (instanceName: string): Promise<Pod[]> => {
    return await invoke('get_k8s_pods_cmd', { instanceName });
};

// Calculate age from creationTimestamp
const calculateAge = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays}d`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) return `${diffHours}h`;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) return `${diffMinutes}m`;

    return 'Just now';
};

export const useK8sPods = (instanceName: string | undefined) => {
    return useQuery({
        queryKey: ['k8s-pods', instanceName],
        queryFn: () => (instanceName ? fetchK8sPods(instanceName) : Promise.resolve([])),
        enabled: !!instanceName,
        select: (data): UIPod[] => {
            return data.map((pod) => {
                // Collect env vars from all containers
                const envVars: Array<{ name: string; value: string; source: string }> = [];
                if (pod.spec?.containers) {
                    for (const container of pod.spec.containers) {
                        if (container.env) {
                            for (const env of container.env) {
                                let source = 'literal';
                                let value = env.value || '';

                                if (env.valueFrom) {
                                    if (env.valueFrom.configMapKeyRef) {
                                        source = 'configmap';
                                        value = `${env.valueFrom.configMapKeyRef.name}:${env.valueFrom.configMapKeyRef.key}`;
                                    } else if (env.valueFrom.secretKeyRef) {
                                        source = 'secret';
                                        value = '***'; // Mask secret
                                    }
                                }

                                envVars.push({
                                    name: env.name,
                                    value,
                                    source
                                });
                            }
                        }
                    }
                }

                return {
                    id: pod.metadata.uid || pod.metadata.name,
                    name: pod.metadata.name,
                    namespace: pod.metadata.namespace,
                    status: pod.status?.phase || 'Unknown',
                    node: pod.spec?.nodeName || 'Unknown',
                    ip: pod.status?.podIP || 'None',
                    age: calculateAge(pod.metadata.creationTimestamp),
                    labels: pod.metadata.labels || {},
                    env: envVars,
                };
            });
        },
        refetchInterval: 5000,
    });
};
