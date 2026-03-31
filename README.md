# 0ma

Fast, light, and fully open-source. Run Docker containers and Kubernetes on macOS in a ~15 MB desktop app — powered by [Lima](https://github.com/lima-vm/lima).

<img width="1111" height="1118" alt="0ma Screenshot" src="https://github.com/user-attachments/assets/c9c5a346-c511-40e3-b63e-1ae2c1333612" />

## Why 0ma?

- **~15 MB** — Not a 2 GB install. Built with Tauri and Rust.
- **Docker & Kubernetes** — One-click setup for both. Same workflow, without the overhead.
- **Built-in Terminal** — SSH into your VM with multiple tabs and split panes. No separate terminal needed.
- **Auto Environment Setup** — One click sets `DOCKER_HOST` and `KUBECONFIG` in your shell. Your local `docker` and `kubectl` just work.
- **Visual Config Editor** — Edit Lima YAML with Monaco, or use visual controls for CPUs, memory, port forwards, mounts, and provisioning.
- **100% Open Source** — MIT / Apache-2.0. Powered by Lima — the same engine behind Colima and Rancher Desktop. No account required, no telemetry.

## Installation

### Homebrew (Recommended)

```bash
brew install chenhunghan/tap/0ma
```

### Download

Download the latest release for macOS (Apple Silicon & Intel):

**[Download 0ma for macOS](https://github.com/chenhunghan/0ma/releases)**

1. Download the `.dmg` file from the Releases page.
2. Open the disk image and drag **0ma** to your **Applications** folder.
3. Remove the quarantine attribute (the binary is unsigned):
   ```bash
   xattr -cr /Applications/0ma.app
   ```
4. Launch 0ma from your Applications directory.

### Build from Source

**Requirements:**

- Node.js (v18+)
- Rust (latest stable)
- `limactl` installed and available in PATH

```bash
git clone https://github.com/chenhunghan/0ma.git
cd 0ma
npm install
npm run tauri dev       # development
npm run tauri build     # production
```

## License

Copyright 2025 Hung-Han Chen <chenhungh@gmail.com>.

Licensed under the dual [MIT](LICENSE-MIT) and [Apache-2.0](LICENSE-APACHE) licenses.
