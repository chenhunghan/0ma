import { InstanceStatus } from '../types/InstanceStatus';
import { LimaInstance } from '../types/LimaInstance';
import { LimaConfig } from '../types/LimaConfig';

// Mock Data
export const DEFAULT_CONFIG: LimaConfig = {
  vmType: "vz",
  cpus: 4,
  memory: "4GiB",
  disk: "100GiB",
  images: [
    {
      location: "https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-arm64.img",
      arch: "aarch64"
    }
  ],
  mounts: [],
  containerd: {
    system: false,
    user: false
  },
  minimumLimaVersion: "2.0.0",
  copyToHost: [
    {
      guest: "/var/lib/k0s/pki/admin.conf",
      host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml",
      deleteOnStop: true
    }
  ],
  provision: [
    {
      mode: "system",
      script: `#!/bin/bash
set -eux -o pipefail
command -v k0s >/dev/null 2>&1 && exit 0

# install k0s prerequisites
curl -sfL https://get.k0s.sh | sh
`
    },
    {
      mode: "system",
      script: `#!/bin/bash
set -eux -o pipefail

#  start k0s as a single node cluster
if ! systemctl status k0scontroller >/dev/null 2>&1; then
  k0s install controller --single
fi

systemctl start k0scontroller
`
    }
  ],
  probes: [
    {
      description: "k0s to be running",
      script: `#!/bin/bash
set -eux -o pipefail
if ! timeout 30s bash -c "until sudo test -f /var/lib/k0s/pki/admin.conf; do sleep 3; done"; then
  echo >&2 "k0s kubeconfig file has not yet been created"
  exit 1
fi
`,
      hint: `The k0s control plane is not ready yet.
Run "limactl shell k0s sudo journalctl -u k0scontroller" to debug.
`
    }
  ]
};

const initialInstances: LimaInstance[] = [
  {
    id: '1',
    name: 'docker-dev',
    status: InstanceStatus.Running,
    cpus: 4,
    memory: '8GiB',
    disk: '50GiB',
    arch: 'aarch64',
    config: DEFAULT_CONFIG,
    k8s: {
      version: 'v1.29.1+k3s1',
      nodes: 1,
      pods: 12,
      services: 5,
      status: 'Ready'
    }
  },
  {
    id: '2',
    name: 'k8s-cluster',
    status: InstanceStatus.Stopped,
    cpus: 2,
    memory: '4GiB',
    disk: '100GiB',
    arch: 'aarch64',
    config: DEFAULT_CONFIG,
    k8s: {
      version: 'v1.28.0',
      nodes: 3,
      pods: 0,
      services: 0,
      status: 'Unknown'
    }
  },
  {
    id: '3',
    name: 'experimental',
    status: InstanceStatus.Error,
    cpus: 2,
    memory: '2GiB',
    disk: '20GiB',
    arch: 'aarch64',
    config: DEFAULT_CONFIG,
  },
];

class LimaService {
  private instances: LimaInstance[] = [...initialInstances];

  async getInstances(): Promise<LimaInstance[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...this.instances]), 300);
    });
  }

  async startInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.id === id);
        if (instance) instance.status = InstanceStatus.Running;
        resolve();
      }, 1500);
    });
  }

  async stopInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.id === id);
        if (instance) instance.status = InstanceStatus.Stopped;
        resolve();
      }, 1500);
    });
  }

  async deleteInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.instances = this.instances.filter((i) => i.id !== id);
        resolve();
      }, 800);
    });
  }

  async updateConfig(id: string, newConfig: LimaConfig): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.id === id);
        if (instance) instance.config = newConfig;
        resolve();
      }, 500);
    });
  }

  async createInstance(name: string, config: LimaConfig = DEFAULT_CONFIG): Promise<LimaInstance> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newInstance: LimaInstance = {
            id: Math.random().toString(36).substr(2, 9),
            name: name || `instance-${Math.floor(Math.random() * 1000)}`,
            status: InstanceStatus.Stopped,
            // Fallback values if config is missing them
            cpus: config.cpus || 2,
            memory: config.memory || '4GiB',
            disk: config.disk || '100GiB',
            // Detect arch from images or default
            arch: (config.images?.[0]?.arch as any) || 'aarch64',
            config: config,
            k8s: {
                version: 'v1.29.0',
                nodes: 1,
                pods: 0,
                services: 0,
                status: 'NotReady'
            }
        };

        this.instances.push(newInstance);
        resolve(newInstance);
      }, 600);
    });
  }
}

export const limaService = new LimaService();