import { LimaConfig } from '../types/LimaConfig';

interface QuickConfigEditorProps {
  config: LimaConfig;
  onChange: (config: LimaConfig) => void;
}

export function QuickConfigEditor({ config, onChange }: QuickConfigEditorProps) {
  const updateConfig = (path: string, value: any) => {
    const keys = path.split('.');
    const updated = { ...config };
    let current: any = updated;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    onChange(updated);
  };

  return (
    <div style={{ padding: "15px", background: "#f9f9f9", borderRadius: "4px" }}>
      <h4>Quick Configuration</h4>
      <div style={{ display: "grid", gap: "15px", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>

        {/* Basic Settings */}
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>VM Type:</label>
          <input
            type="text"
            value={config.vm_type || ''}
            onChange={(e) => updateConfig('vm_type', e.target.value || undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="vz, qemu, krunkit"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Minimum Lima Version:</label>
          <input
            type="text"
            value={config.minimum_lima_version || ''}
            onChange={(e) => updateConfig('minimum_lima_version', e.target.value || undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="Not specified"
          />
        </div>

        {/* Resources */}
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>CPUs:</label>
          <input
            type="number"
            value={config.cpus || ''}
            onChange={(e) => updateConfig('cpus', e.target.value ? parseInt(e.target.value) : undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="Default"
            min="1"
            max="32"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Memory (e.g., "4GiB", "8GB"):</label>
          <input
            type="text"
            value={config.memory || ''}
            onChange={(e) => updateConfig('memory', e.target.value || undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="4GiB"
          />
        </div>

        {/* Containerd */}
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Containerd Settings:</label>
          <div style={{ display: "flex", gap: "15px" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.containerd?.system || false}
                onChange={(e) => updateConfig('containerd.system', e.target.checked)}
                style={{ marginRight: "5px" }}
              />
              System
            </label>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.containerd?.user || false}
                onChange={(e) => updateConfig('containerd.user', e.target.checked)}
                style={{ marginRight: "5px" }}
              />
              User
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}