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
    id: 'p1',
    name: 'coredns-7c65d66c9b-v4q7m',
    namespace: 'kube-system',
    status: 'Running',
    node: 'node-01',
    ip: '10.42.0.5',
    age: '4d',
    labels: { 'k8s-app': 'kube-dns', 'pod-template-hash': '7c65d66c9b' },
    env: [
       { name: 'CONFIG_FILE', value: '/etc/coredns/Corefile', source: 'configmap' },
       { name: 'MAX_RETRIES', value: '5', source: 'literal' }
    ]
  },
  {
    id: 'p2',
    name: 'local-path-provisioner-64797c5f8-j9l4k',
    namespace: 'kube-system',
    status: 'Running',
    node: 'node-01',
    ip: '10.42.0.6',
    age: '4d',
    labels: { 'app': 'local-path-provisioner' },
    env: [
        { name: 'PROVISIONER_NAME', value: 'rancher.io/local-path', source: 'literal' }
    ]
  },
  {
    id: 'p3',
    name: 'postgres-db-0',
    namespace: 'default',
    status: 'Running',
    node: 'node-01',
    ip: '10.42.0.12',
    age: '2h',
    labels: { 'app': 'postgres', 'role': 'master' },
    env: [
        { name: 'POSTGRES_USER', value: 'admin', source: 'secret' },
        { name: 'POSTGRES_PASSWORD', value: '******', source: 'secret' },
        { name: 'PGDATA', value: '/var/lib/postgresql/data', source: 'literal' }
    ]
  },
  {
      id: 'p4',
      name: 'frontend-app-deployment-55d4c8f9-x2z9',
      namespace: 'default',
      status: 'Pending',
      node: 'node-01',
      ip: 'None',
      age: '1m',
      labels: { 'app': 'frontend', 'tier': 'web' },
      env: [
          { name: 'API_URL', value: 'http://backend:8080', source: 'configmap' },
          { name: 'API_KEY', value: '******', source: 'secret' },
          { name: 'DEBUG', value: 'true', source: 'literal' }
      ]
  }
];

export const MOCK_SERVICES: MockService[] = [
  {
    id: 's1',
    name: 'kubernetes',
    namespace: 'default',
    type: 'ClusterIP',
    clusterIP: '10.43.0.1',
    externalIP: '<none>',
    ports: [
      { name: 'https', port: 443, targetPort: 6443, protocol: 'TCP' }
    ],
    selector: {},
    age: '5d',
    status: 'Active'
  },
  {
    id: 's2',
    name: 'coredns',
    namespace: 'kube-system',
    type: 'ClusterIP',
    clusterIP: '10.43.0.10',
    externalIP: '<none>',
    ports: [
      { name: 'dns', port: 53, targetPort: 53, protocol: 'UDP' },
      { name: 'dns-tcp', port: 53, targetPort: 53, protocol: 'TCP' }
    ],
    selector: { 'k8s-app': 'kube-dns' },
    age: '5d',
    status: 'Active'
  },
  {
    id: 's3',
    name: 'frontend-svc',
    namespace: 'default',
    type: 'LoadBalancer',
    clusterIP: '10.43.200.54',
    externalIP: '192.168.5.15',
    ports: [
      { name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }
    ],
    selector: { 'app': 'frontend', 'tier': 'web' },
    age: '2h',
    status: 'Active'
  },
  {
    id: 's4',
    name: 'postgres-svc',
    namespace: 'default',
    type: 'ClusterIP',
    clusterIP: '10.43.150.22',
    externalIP: '<none>',
    ports: [
      { name: 'db', port: 5432, targetPort: 5432, protocol: 'TCP' }
    ],
    selector: { 'app': 'postgres' },
    age: '2h',
    status: 'Active'
  }
];