import type { LimaInstance } from "src/types/LimaInstance";
import type { LimaConfig } from "src/types/LimaConfig";
import { InstanceStatus } from "src/types/InstanceStatus";

export const MOCK_INSTANCES: LimaInstance[] = [
  {
    name: "dev-env",
    status: InstanceStatus.Running,
    cpus: 4,
    memory: "8GiB",
    disk: "100GiB",
    arch: "aarch64",
    version: "1.0.0",
    ssh_address: "127.0.0.1",
    ssh_local_port: 60022,
    dir: "/Users/demo/.lima/dev-env",
  },
  {
    name: "k8s-cluster",
    status: InstanceStatus.Stopped,
    cpus: 2,
    memory: "4GiB",
    disk: "50GiB",
    arch: "aarch64",
    version: "1.0.0",
    dir: "/Users/demo/.lima/k8s-cluster",
  },
];

export const MOCK_LIMA_CONFIG: LimaConfig = {
  minimumLimaVersion: "1.0.0",
  vmType: "vz",
  cpus: 4,
  memory: "8GiB",
  disk: "100GiB",
  images: [
    {
      location:
        "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-arm64.img",
      arch: "aarch64",
    },
    {
      location:
        "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img",
      arch: "x86_64",
    },
  ],
  mounts: [
    { location: "~", mountPoint: "/home/user.linux", writable: true },
    { location: "/tmp/lima", mountPoint: "/tmp/lima", writable: true },
  ],
  containerd: { system: false, user: false },
  provision: [
    {
      mode: "system",
      script: `#!/bin/bash
set -eux -o pipefail
curl -fsSL https://get.docker.com | sh
`,
    },
  ],
  probes: [
    {
      description: "docker to be installed",
      script: "#!/bin/bash\nset -eux -o pipefail\nif ! timeout 30s bash -c 'until command -v docker; do sleep 3; done'; then\n  echo >&2 \"docker is not installed yet\"\n  exit 1\nfi",
      hint: "See /var/log/cloud-init-output.log in the guest",
    },
  ],
  copyToHost: [
    {
      guest: "/etc/docker/certs.d",
      host: "{{.Dir}}/copied-from-guest/docker-certs",
      deleteOnStop: false,
    },
  ],
  portForwards: [
    { guestPort: 80, hostPort: 8080, proto: "tcp" },
    { guestIPMustBeZero: true, guestPort: 443, hostPort: 8443, proto: "tcp" },
  ],
};

export const MOCK_K8S_CONFIG: LimaConfig = {
  minimumLimaVersion: "1.0.0",
  vmType: "vz",
  cpus: 2,
  memory: "4GiB",
  disk: "50GiB",
  images: [
    {
      location:
        "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-arm64.img",
      arch: "aarch64",
    },
  ],
  mounts: [
    { location: "~", mountPoint: "/home/user.linux", writable: true },
  ],
  containerd: { system: true, user: false },
  provision: [
    {
      mode: "system",
      script: `#!/bin/bash
set -eux -o pipefail
curl -sSLf https://get.k0s.sh | sudo sh
sudo k0s install controller --single
sudo k0s start
`,
    },
  ],
  probes: [
    {
      description: "k0s to be running",
      script: "#!/bin/bash\nset -eux -o pipefail\nif ! timeout 120s bash -c 'until sudo k0s status; do sleep 3; done'; then\n  echo >&2 \"k0s is not running yet\"\n  exit 1\nfi",
      hint: "Check k0s service status with: sudo k0s status",
    },
  ],
  portForwards: [
    { guestPort: 6443, hostPort: 6443, proto: "tcp" },
  ],
};

export const MOCK_DISK_USAGE = {
  total: "100G",
  used: "12.4G",
  available: "87.6G",
  use_percent: "13%",
};

export const MOCK_NETWORK_INTERFACES = [
  { name: "lima0", ip: "192.168.5.15" },
  { name: "eth0", ip: "192.168.64.3" },
];

export const MOCK_GUEST_DIAGNOSTICS = {
  os_pretty_name: "Ubuntu 24.04.1 LTS",
  kernel_version: "6.8.0-45-generic",
};

export const MOCK_GUEST_INFO = {
  engine: "docker",
};

export const MOCK_SYSTEM_CAPABILITIES = {
  arch: "aarch64",
  macosVersion: "15.3",
  krunkitAvailable: false,
  krunkitDriverAvailable: false,
};

export const MOCK_K8S_PODS = [
  {
    metadata: {
      name: "nginx-deployment-abc123",
      namespace: "default",
      uid: "pod-1",
      creationTimestamp: "2026-03-28T10:00:00Z",
      labels: { app: "nginx" },
    },
    spec: {
      nodeName: "k8s-cluster",
      containers: [{ name: "nginx", env: [] }],
    },
    status: {
      phase: "Running",
      hostIP: "192.168.5.15",
      podIP: "10.244.0.5",
      startTime: "2026-03-28T10:00:00Z",
    },
  },
  {
    metadata: {
      name: "redis-master-def456",
      namespace: "default",
      uid: "pod-2",
      creationTimestamp: "2026-03-28T10:05:00Z",
      labels: { app: "redis", role: "master" },
    },
    spec: {
      nodeName: "k8s-cluster",
      containers: [{ name: "redis" }],
    },
    status: {
      phase: "Running",
      hostIP: "192.168.5.15",
      podIP: "10.244.0.6",
      startTime: "2026-03-28T10:05:00Z",
    },
  },
];

export const MOCK_K8S_SERVICES = [
  {
    metadata: {
      name: "kubernetes",
      namespace: "default",
      uid: "svc-1",
      creationTimestamp: "2026-03-28T09:00:00Z",
      labels: { component: "apiserver", provider: "kubernetes" },
    },
    spec: {
      ports: [{ port: 443, targetPort: 6443, protocol: "TCP" }],
      clusterIP: "10.96.0.1",
      type: "ClusterIP",
    },
  },
  {
    metadata: {
      name: "nginx-service",
      namespace: "default",
      uid: "svc-2",
      creationTimestamp: "2026-03-28T10:01:00Z",
      labels: { app: "nginx" },
    },
    spec: {
      ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
      selector: { app: "nginx" },
      clusterIP: "10.96.0.42",
      type: "ClusterIP",
    },
  },
];

// Pre-recorded terminal output: docker ps
export const MOCK_TERMINAL_OUTPUT = [
  { delay: 50, data: "\x1b]0;docker\x07" },
  { delay: 100, data: "\x1b[32muser@dev-env\x1b[0m:\x1b[34m~\x1b[0m$ " },
  { delay: 800, data: "d" },
  { delay: 60, data: "o" },
  { delay: 70, data: "c" },
  { delay: 50, data: "k" },
  { delay: 80, data: "e" },
  { delay: 60, data: "r" },
  { delay: 70, data: " " },
  { delay: 50, data: "p" },
  { delay: 80, data: "s" },
  { delay: 500, data: "\r\n" },
  {
    delay: 200,
    data: "CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS                  NAMES\r\n",
  },
  {
    delay: 50,
    data: "a1b2c3d4e5f6   nginx:latest   \"/docker-entrypoint.…\"   2 hours ago    Up 2 hours    0.0.0.0:8080->80/tcp   web-server\r\n",
  },
  {
    delay: 50,
    data: "f6e5d4c3b2a1   redis:7        \"docker-entrypoint.s…\"   3 hours ago    Up 3 hours    6379/tcp               redis-cache\r\n",
  },
  {
    delay: 50,
    data: "b3c4d5e6f7a8   postgres:16    \"docker-entrypoint.s…\"   5 hours ago    Up 5 hours    5432/tcp               app-db\r\n",
  },
  { delay: 300, data: "\x1b[32muser@dev-env\x1b[0m:\x1b[34m~\x1b[0m$ " },
  { delay: 3000, data: "\x1b[5m▌\x1b[0m" },
];

// Pre-recorded terminal output: kubectl get pods
export const MOCK_KUBECTL_OUTPUT = [
  { delay: 50, data: "\x1b]0;kubectl\x07" },
  { delay: 100, data: "\x1b[32muser@k8s-cluster\x1b[0m:\x1b[34m~\x1b[0m$ " },
  { delay: 600, data: "k" },
  { delay: 60, data: "u" },
  { delay: 70, data: "b" },
  { delay: 50, data: "e" },
  { delay: 80, data: "c" },
  { delay: 60, data: "t" },
  { delay: 70, data: "l" },
  { delay: 80, data: " " },
  { delay: 50, data: "g" },
  { delay: 60, data: "e" },
  { delay: 70, data: "t" },
  { delay: 80, data: " " },
  { delay: 50, data: "p" },
  { delay: 60, data: "o" },
  { delay: 70, data: "d" },
  { delay: 50, data: "s" },
  { delay: 80, data: " " },
  { delay: 50, data: "-" },
  { delay: 60, data: "A" },
  { delay: 500, data: "\r\n" },
  {
    delay: 300,
    data: "NAMESPACE     NAME                              READY   STATUS    RESTARTS   AGE\r\n",
  },
  {
    delay: 50,
    data: "default       nginx-deployment-abc123           1/1     Running   0          3d\r\n",
  },
  {
    delay: 50,
    data: "default       redis-master-def456               1/1     Running   0          3d\r\n",
  },
  {
    delay: 50,
    data: "default       api-server-7f8b9c-x2k4p           1/1     Running   0          2d\r\n",
  },
  {
    delay: 50,
    data: "kube-system   coredns-5dd5756b68-abcde          1/1     Running   0          5d\r\n",
  },
  {
    delay: 50,
    data: "kube-system   kube-proxy-fghij                  1/1     Running   0          5d\r\n",
  },
  {
    delay: 50,
    data: "kube-system   metrics-server-6d94bc8694-klmno   1/1     Running   0          5d\r\n",
  },
  { delay: 300, data: "\x1b[32muser@k8s-cluster\x1b[0m:\x1b[34m~\x1b[0m$ " },
  // Second command: kubectl get services
  { delay: 1200, data: "k" },
  { delay: 60, data: "u" },
  { delay: 70, data: "b" },
  { delay: 50, data: "e" },
  { delay: 80, data: "c" },
  { delay: 60, data: "t" },
  { delay: 70, data: "l" },
  { delay: 80, data: " " },
  { delay: 50, data: "g" },
  { delay: 60, data: "e" },
  { delay: 70, data: "t" },
  { delay: 80, data: " " },
  { delay: 50, data: "s" },
  { delay: 60, data: "v" },
  { delay: 70, data: "c" },
  { delay: 500, data: "\r\n" },
  {
    delay: 300,
    data: "NAME         TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)    AGE\r\n",
  },
  {
    delay: 50,
    data: "kubernetes   ClusterIP   10.96.0.1     <none>        443/TCP    5d\r\n",
  },
  {
    delay: 50,
    data: "nginx-svc    ClusterIP   10.96.0.42    <none>        80/TCP     3d\r\n",
  },
  {
    delay: 50,
    data: "redis-svc    ClusterIP   10.96.0.58    <none>        6379/TCP   3d\r\n",
  },
  {
    delay: 50,
    data: "api-svc      ClusterIP   10.96.0.71    <none>        8080/TCP   2d\r\n",
  },
  { delay: 300, data: "\x1b[32muser@k8s-cluster\x1b[0m:\x1b[34m~\x1b[0m$ " },
  { delay: 3000, data: "\x1b[5m▌\x1b[0m" },
];

