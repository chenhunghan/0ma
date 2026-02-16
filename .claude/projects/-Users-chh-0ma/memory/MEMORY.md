# Project Memory

## Tauri macOS Traffic Lights

- `titleBarStyle: "Transparent"` provides native window drag for free — no need for `data-tauri-drag-region` or `getCurrentWindow().startDragging()`
- Content extends under the titlebar (fullSizeContentView), so `pt-[18px]` on the root wrapper in App.tsx clears the traffic lights
- `hiddenTitle` and `acceptFirstMouse` are NOT needed with this approach
- `"Overlay"` mode is NOT recommended — caused inconsistent traffic light positioning and requires extra ACL permissions (`core:window:allow-start-dragging`) for drag to work
- Config changes in tauri.conf.json require restarting the Tauri dev server (not hot-reloaded)
