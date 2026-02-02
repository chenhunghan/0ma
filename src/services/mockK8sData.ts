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
      { name: "CONFIG_FILE", value: "/etc/coredns/Corefile", source: "configmap" },
      { name: "MAX_RETRIES", value: "5", source: "literal" },
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
    env: [{ name: "PROVISIONER_NAME", value: "rancher.io/local-path", source: "literal" }],
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
      { name: "POSTGRES_USER", value: "admin", source: "secret" },
      { name: "POSTGRES_PASSWORD", value: "******", source: "secret" },
      { name: "PGDATA", value: "/var/lib/postgresql/data", source: "literal" },
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
      { name: "API_URL", value: "http://backend:8080", source: "configmap" },
      { name: "API_KEY", value: "******", source: "secret" },
      { name: "DEBUG", value: "true", source: "literal" },
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
    ports: [{ name: "https", port: 443, targetPort: 6443, protocol: "TCP" }],
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
      { name: "dns", port: 53, targetPort: 53, protocol: "UDP" },
      { name: "dns-tcp", port: 53, targetPort: 53, protocol: "TCP" },
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
    ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
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
    ports: [{ name: "db", port: 5432, targetPort: 5432, protocol: "TCP" }],
    selector: { app: "postgres" },
    status: "Active",
    type: "ClusterIP",
  },
];
