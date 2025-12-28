export interface Image {
  location: string;
  arch?: string;
  digest?: string;
}

export interface Mount {
  location?: string;
  mountPoint?: string;
  writable?: boolean;
}

export interface ContainerdConfig {
  system: boolean;
  user: boolean;
}

export interface Provision {
  mode: string;
  script: string;
}

export interface Probe {
  description: string;
  script: string;
  hint?: string;
}

export interface CopyToHost {
  guest: string;
  host: string;
  deleteOnStop?: boolean;
}

export interface PortForward {
  guestIPMustBeZero?: boolean;
  guestIP?: string;
  guestPort?: number;
  guestPortRange?: [number, number];
  guestSocket?: string;
  hostIP?: string;
  hostPort?: number;
  hostPortRange?: [number, number];
  hostSocket?: string;
  proto?: string;
  ignore?: boolean;
}

export interface LimaConfig {
  minimumLimaVersion?: string;
  vmType?: string;
  cpus?: number;
  memory?: string;
  disk?: string;
  images?: Image[];
  mounts?: Mount[];
  containerd?: ContainerdConfig;
  provision?: Provision[];
  probes?: Probe[];
  copyToHost?: CopyToHost[];
  portForwards?: PortForward[];
  [key: string]: unknown; // Allow for other fields
}