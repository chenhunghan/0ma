# 0ma

A modern, desktop-based GUI for managing [Lima](https://github.com/lima-vm/lima) instances and Kubernetes clusters on macOS.

<img width="1111" height="1118" alt="0ma Screenshot" src="https://github.com/user-attachments/assets/c9c5a346-c511-40e3-b63e-1ae2c1333612" />

## Features

- 🖥️ **Instance Management**: Easily create, start, stop, and delete Lima virtual machines.
- ☸️ **Kubernetes Dashboard**: Visual interface for interacting with your K8s clusters (Pods, Services, Nodes).
- 🐚 **Integrated Terminal**: Built-in terminal for direct shell access to instances and containers.
- ⚙️ **Config Editor**: Advanced configuration management for `lima.yaml` with syntax highlighting.
- 🚀 **Performance**: Native macOS application built with Rust and Tauri.

## Installation

### Download

Download the latest release for macOS (Apple Silicon/M1/M2/M3):

**[⬇️ Download 0ma for macOS](https://github.com/chenhunghan/0ma/releases)**

1. Download the `.dmg` file from the Releases page.
2. Open the disk image and drag **0ma** to your **Applications** folder.
3. Launch 0ma from your Applications directory.

### Build from Source

**Requirements:**
- Node.js (v18+)
- Rust (latest stable)
- `limactl` installed and available in PATH

```bash
# Clone the repository
git clone https://github.com/chenhunghan/0ma.git
cd 0ma

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### App Icon

Generate the app icon using the following prompt:

```markdown
Use this prompt to generate a new icon png
```
A bold, ultra-minimalist, solid black 'om' logo on a pure solid white #FFFFFF background with monospace font. The design must be a vector-style flat shape with distinct, thick lines. No gradients, no gray, not in calligraphy style, just #000000 black and #FFFFFF white. The logo MUST be vertical and horizontal centered in the image. Highest resolution for a Mac system tray icon following macOS design guidelines. The file should be in PNG format.
```
Save the generated image at `./src-tauri/icons/tray-icon-white-path.png`

Finally run this script `node scripts/convert.ts src-tauri/icons/tray-icon-white-path.png src-tauri/icons/tray-icon-black-path.png src-tauri/icons/tray-icon.png` to covert to `tray-icon.png`
```

## License

Copyright © 2025 Hung-Han Chen <chenhungh@gmail.com>.

Licensed under the dual [MIT](LICENSE-MIT) and [Apache-2.0](LICENSE-APACHE) licenses.
