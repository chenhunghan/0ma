import { LimaConfig } from '../types/lima-config';

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
          <label style={{ display: "block", marginBottom: "5px" }}>Instance Name:</label>
          <input
            type="text"
            value={config.name || ''}
            onChange={(e) => updateConfig('name', e.target.value || undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="Default"
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
          <label style={{ display: "block", marginBottom: "5px" }}>Memory (GB):</label>
          <input
            type="number"
            value={config.memory ? Math.round(config.memory / 1024 / 1024 / 1024) : ''}
            onChange={(e) => updateConfig('memory', e.target.value ? parseInt(e.target.value) * 1024 * 1024 * 1024 : undefined)}
            style={{ width: "100%", padding: "5px" }}
            placeholder="Default"
            min="1"
            max="128"
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

        {/* SSH Settings */}
        {config.ssh && (
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>SSH Settings:</label>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  value={config.ssh.local_port || ''}
                  onChange={(e) => {
                    const ssh = { ...config.ssh! };
                    ssh.local_port = e.target.value ? parseInt(e.target.value) : undefined;
                    updateConfig('ssh', ssh);
                  }}
                  placeholder="Port"
                  style={{ width: "80px", padding: "3px", marginRight: "5px" }}
                  min="1"
                  max="65535"
                />
                Local Port
              </label>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={config.ssh.forward_agent || false}
                  onChange={(e) => {
                    const ssh = { ...config.ssh! };
                    ssh.forward_agent = e.target.checked;
                    updateConfig('ssh', ssh);
                  }}
                  style={{ marginRight: "5px" }}
                />
                Forward Agent
              </label>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={config.ssh.forward_x11 || false}
                  onChange={(e) => {
                    const ssh = { ...config.ssh! };
                    ssh.forward_x11 = e.target.checked;
                    updateConfig('ssh', ssh);
                  }}
                  style={{ marginRight: "5px" }}
                />
                Forward X11
              </label>
            </div>
          </div>
        )}

        {/* Environment Variables */}
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Environment Variables: {config.env ? Object.keys(config.env).length : 0}
          </label>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {config.env && Object.keys(config.env).length > 0 ? (
              <div>{Object.entries(config.env).slice(0, 3).map(([k, v]) => (
                <div key={k}>{k}={v}</div>
              ))}</div>
            ) : (
              <span>Click "Edit Configuration" to manage environment variables</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}