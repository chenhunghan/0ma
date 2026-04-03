<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" height="128" alt="0ma icon" />
</p>

Fast, light, and fully open-source. Run Docker containers and Kubernetes on macOS in a ~15 MB desktop app — powered by [Lima](https://github.com/lima-vm/lima).

<img width="1277" height="1063" alt="Screenshot 2026-03-31 at 20 59 46" src="https://github.com/user-attachments/assets/8b00e8e6-c14c-49d0-b9ac-21807b663f74" />

## Why 0ma?

- **~15 MB** — Not a 1 GB install. Built with Tauri and Rust.
- **Docker & Kubernetes** — One-click setup for both. Same workflow, without the overhead.
- **Built-in Terminal** — Multiple tabs and split panes.
- **Auto Environment Setup** — One click sets `DOCKER_HOST` and `KUBECONFIG` in your shell. Your local `docker` and `kubectl` just work.
- **Visual Config Editor** — Edit Lima YAML, or use visual controls for CPUs, memory, port forwards, mounts, and provisioning.

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
