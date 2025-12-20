export interface SshfsConfig {
  cache?: boolean;
  follow_symlinks?: boolean;
  sftp_read_dirs?: boolean;
}

export interface NinePConfig {
  security_model?: string;
  protocol_version?: string;
  msize?: number;
  cache_size?: number;
  io_size?: number;
}

export interface Mount {
  location?: string;
  mount_point?: string;
  writable?: boolean;
  sshfs?: SshfsConfig;
  ninep?: NinePConfig;
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

export interface CopyFromHost {
  host: string;
  guest: string;
}

export interface Network {
  name: string;
  vnl?: string;
  switch?: string;
}

export interface PortForward {
  guest?: number;
  host?: number;
  guest_ip?: string;
  host_ip?: string;
  proto?: string;
  ignore?: boolean;
  reverse?: boolean;
}

export interface DnsConfig {
  addresses?: string[];
}

export interface SshConfig {
  local_port?: number;
  load_dot_ssh?: boolean;
  forward_agent?: boolean;
  forward_x11?: boolean;
}

export interface LimaConfig {
  minimum_lima_version?: string;
  name?: string;
  base: string;
  mounts?: Mount[];
  networks?: Network[];
  port_forwards?: PortForward[];
  containerd?: ContainerdConfig;
  dns?: DnsConfig;
  env?: { [key: string]: string };
  provision?: Provision[];
  probes?: Probe[];
  copy_to_host?: CopyToHost[];
  copy_from_host?: CopyFromHost[];
  message?: string;
  cpus?: number;
  memory?: number;
  disk?: string;
  ssh?: SshConfig;
}