import { InstanceStatus } from '../types/InstanceStatus';
import { LimaInstance } from '../types/LimaInstance';
import { LimaConfig } from '../types/LimaConfig';

class LimaService {
  private instances: LimaInstance[] = [];

  async getInstances(): Promise<LimaInstance[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...this.instances]), 300);
    });
  }

  async startInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.name === id);
        if (instance) instance.status = InstanceStatus.Running;
        resolve();
      }, 1500);
    });
  }

  async stopInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.name === id);
        if (instance) instance.status = InstanceStatus.Stopped;
        resolve();
      }, 1500);
    });
  }

  async deleteInstance(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.instances = this.instances.filter((i) => i.name !== id);
        resolve();
      }, 800);
    });
  }

  async updateConfig(id: string, newConfig: LimaConfig): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.name === id);
        if (instance) instance.config = newConfig;
        resolve();
      }, 500);
    });
  }

  async createInstance(name: string, config: LimaConfig): Promise<LimaInstance> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newInstance: LimaInstance = {
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