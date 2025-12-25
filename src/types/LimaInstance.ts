import { InstanceStatus } from './InstanceStatus';
import { K8sInfo } from './K8sInfo';
import { LimaConfig } from './LimaConfig';

export type Arch = 'x86_64' | 'aarch64';

export interface LimaInstance {
  name: string;
  status: InstanceStatus;
  cpus: number;
  memory: string;
  disk: string;
  arch: Arch;
  config?: LimaConfig;
  k8s?: K8sInfo;
}