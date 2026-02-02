export interface MockPodEnv {
  name: string;
  value: string;
  source: string;
}

export interface MockPod {
  id: string;
  name: string;
  namespace: string;
  status: string;
  node: string;
  ip: string;
  age: string;
  labels: Record<string, string>;
  env: MockPodEnv[];
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number;
  protocol: string;
  nodePort?: number;
}

export interface MockService {
  id: string;
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: ServicePort[];
  selector: Record<string, string>;
  age: string;
  status: string;
}

export const MOCK_PODS: MockPod[] = [
  {
    age: "4d",
    env: [
      { name: "CONFIG_FILE", source: "configmap", value: "/etc/coredns/Corefile" },
      { name: "MAX_RETRIES", source: "literal", value: "5" },
    ],
    id: "p1",
    ip: "10.42.0.5",
    labels: { "k8s-app": "kube-dns", "pod-template-hash": "7c65d66c9b" },
    name: "coredns-7c65d66c9b-v4q7m",
    namespace: "kube-system",
    node: "node-01",
    status: "Running",
  },
  {
    age: "4d",
    env: [{ name: "PROVISIONER_NAME", source: "literal", value: "rancher.io/local-path" }],
    id: "p2",
    ip: "10.42.0.6",
    labels: { app: "local-path-provisioner" },
    name: "local-path-provisioner-64797c5f8-j9l4k",
    namespace: "kube-system",
    node: "node-01",
    status: "Running",
  },
  {
    age: "2h",
    env: [
      { name: "POSTGRES_USER", source: "secret", value: "admin" },
      { name: "POSTGRES_PASSWORD", source: "secret", value: "******" },
      { name: "PGDATA", source: "literal", value: "/var/lib/postgresql/data" },
    ],
    id: "p3",
    ip: "10.42.0.12",
    labels: { app: "postgres", role: "master" },
    name: "postgres-db-0",
    namespace: "default",
    node: "node-01",
    status: "Running",
  },
  {
    age: "1m",
    env: [
      { name: "API_URL", source: "configmap", value: "http://backend:8080" },
      { name: "API_KEY", source: "secret", value: "******" },
      { name: "DEBUG", source: "literal", value: "true" },
    ],
    id: "p4",
    ip: "None",
    labels: { app: "frontend", tier: "web" },
    name: "frontend-app-deployment-55d4c8f9-x2z9",
    namespace: "default",
    node: "node-01",
    status: "Pending",
  },
];

export const MOCK_SERVICES: MockService[] = [
  {
    age: "5d",
    clusterIP: "10.43.0.1",
    externalIP: "<none>",
    id: "s1",
    name: "kubernetes",
    namespace: "default",
    ports: [{ name: "https", port: 443, protocol: "TCP", targetPort: 6443 }],
    selector: {},
    status: "Active",
    type: "ClusterIP",
  },
  {
    age: "5d",
    clusterIP: "10.43.0.10",
    externalIP: "<none>",
    id: "s2",
    name: "coredns",
    namespace: "kube-system",
    ports: [
      { name: "dns", port: 53, protocol: "UDP", targetPort: 53 },
      { name: "dns-tcp", port: 53, protocol: "TCP", targetPort: 53 },
    ],
    selector: { "k8s-app": "kube-dns" },
    status: "Active",
    type: "ClusterIP",
  },
  {
    age: "2h",
    clusterIP: "10.43.200.54",
    externalIP: "192.168.5.15",
    id: "s3",
    name: "frontend-svc",
    namespace: "default",
    ports: [{ name: "http", port: 80, protocol: "TCP", targetPort: 8080 }],
    selector: { app: "frontend", tier: "web" },
    status: "Active",
    type: "LoadBalancer",
  },
  {
    age: "2h",
    clusterIP: "10.43.150.22",
    externalIP: "<none>",
    id: "s4",
    name: "postgres-svc",
    namespace: "default",
    ports: [{ name: "db", port: 5432, protocol: "TCP", targetPort: 5432 }],
    selector: { app: "postgres" },
    status: "Active",
    type: "ClusterIP",
  },
];
