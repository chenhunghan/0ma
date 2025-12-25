export interface Image {
  location: string;
  arch?: string;
  digest?: string;
}

export interface Mount {
  location?: string;
  mount_point?: string;
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
  delete_on_stop?: boolean;
}

export interface LimaConfig {
  minimum_lima_version?: string;
  vm_type?: string;
  cpus?: number;
  memory?: string;
  disk?: string;
  images?: Image[];
  mounts?: Mount[];
  containerd?: ContainerdConfig;
  provision?: Provision[];
  probes?: Probe[];
  copy_to_host?: CopyToHost[];
}