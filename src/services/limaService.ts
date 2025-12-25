import { LimaInstance } from '../types/LimaInstance';
import { LimaConfig } from '../types/LimaConfig';

class LimaService {
  private instances: LimaInstance[] = [];

  async updateConfig(id: string, newConfig: LimaConfig): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const instance = this.instances.find((i) => i.name === id);
        if (instance) instance.config = newConfig;
        resolve();
      }, 500);
    });
  }
}

export const limaService = new LimaService();