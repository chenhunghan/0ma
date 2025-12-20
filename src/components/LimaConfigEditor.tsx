import { useState } from 'react';
import { LimaConfig } from '../types/lima-config';

interface LimaConfigEditorProps {
  config: LimaConfig;
  onSave: (config: LimaConfig) => void;
  isSaving?: boolean;
}

export function LimaConfigEditor({ config, onSave, isSaving = false }: LimaConfigEditorProps) {
  const [editedConfig, setEditedConfig] = useState<LimaConfig>({ ...config });

  const handleSave = () => {
    onSave(editedConfig);
  };

  const handleReset = () => {
    setEditedConfig({ ...config });
  };

  // Update nested properties
  const updateConfig = (path: string, value: any) => {
    const keys = path.split('.');
    setEditedConfig(prev => {
      const updated = { ...prev };
      let current: any = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Lima Configuration Editor</h2>

      {/* Basic Settings */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Basic Settings</h3>
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div>
            <label>Instance Name:</label>
            <input
              type="text"
              value={editedConfig.name || ''}
              onChange={(e) => updateConfig('name', e.target.value || undefined)}
              style={{ width: "100%", padding: "5px" }}
            />
          </div>
          <div>
            <label>Base Image:</label>
            <input
              type="text"
              value={editedConfig.base}
              onChange={(e) => updateConfig('base', e.target.value)}
              style={{ width: "100%", padding: "5px" }}
            />
          </div>
          <div>
            <label>Minimum Lima Version:</label>
            <input
              type="text"
              value={editedConfig.minimum_lima_version || ''}
              onChange={(e) => updateConfig('minimum_lima_version', e.target.value || undefined)}
              style={{ width: "100%", padding: "5px" }}
            />
          </div>
        </div>
      </section>

      {/* Resources */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Resources</h3>
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <label>CPUs:</label>
            <input
              type="number"
              value={editedConfig.cpus || ''}
              onChange={(e) => updateConfig('cpus', e.target.value ? parseInt(e.target.value) : undefined)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="Default"
            />
          </div>
          <div>
            <label>Memory (GB):</label>
            <input
              type="number"
              value={editedConfig.memory ? Math.round(editedConfig.memory / 1024 / 1024 / 1024) : ''}
              onChange={(e) => updateConfig('memory', e.target.value ? parseInt(e.target.value) * 1024 * 1024 * 1024 : undefined)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="Default"
            />
          </div>
          <div>
            <label>Disk:</label>
            <input
              type="text"
              value={editedConfig.disk || ''}
              onChange={(e) => updateConfig('disk', e.target.value || undefined)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="Default"
            />
          </div>
        </div>
      </section>

      {/* Containerd */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Containerd</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={editedConfig.containerd?.system || false}
              onChange={(e) => updateConfig('containerd.system', e.target.checked)}
            />
            System
          </label>
          <label>
            <input
              type="checkbox"
              checked={editedConfig.containerd?.user || false}
              onChange={(e) => updateConfig('containerd.user', e.target.checked)}
            />
            User
          </label>
        </div>
      </section>

      {/* Mounts */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Mounts ({editedConfig.mounts?.length || 0})</h3>
        <button
          onClick={() => {
            const mounts = [...(editedConfig.mounts || [])];
            mounts.push({ location: "", mount_point: "", writable: false });
            updateConfig('mounts', mounts);
          }}
          style={{ marginBottom: "10px" }}
        >
          Add Mount
        </button>
        {(editedConfig.mounts || []).map((mount, index) => (
          <div key={index} style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "10px", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Mount {index + 1}</strong>
              <button
                onClick={() => {
                  const mounts = (editedConfig.mounts || []).filter((_, i) => i !== index);
                  updateConfig('mounts', mounts);
                }}
                style={{ background: "#ff4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px" }}
              >
                Remove
              </button>
            </div>
            <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Location"
                value={mount.location || ''}
                onChange={(e) => {
                  const mounts = [...(editedConfig.mounts || [])];
                  mounts[index] = { ...mounts[index], location: e.target.value || undefined };
                  updateConfig('mounts', mounts);
                }}
              />
              <input
                type="text"
                placeholder="Mount Point"
                value={mount.mount_point || ''}
                onChange={(e) => {
                  const mounts = [...(editedConfig.mounts || [])];
                  mounts[index] = { ...mounts[index], mount_point: e.target.value || undefined };
                  updateConfig('mounts', mounts);
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={mount.writable || false}
                  onChange={(e) => {
                    const mounts = [...(editedConfig.mounts || [])];
                    mounts[index] = { ...mounts[index], writable: e.target.checked };
                    updateConfig('mounts', mounts);
                  }}
                />
                Writable
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* Networks */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Networks ({editedConfig.networks?.length || 0})</h3>
        <button
          onClick={() => {
            const networks = [...(editedConfig.networks || [])];
            networks.push({ name: "" });
            updateConfig('networks', networks);
          }}
          style={{ marginBottom: "10px" }}
        >
          Add Network
        </button>
        {(editedConfig.networks || []).map((network, index) => (
          <div key={index} style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "10px", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Network {index + 1}</strong>
              <button
                onClick={() => {
                  const networks = (editedConfig.networks || []).filter((_, i) => i !== index);
                  updateConfig('networks', networks);
                }}
                style={{ background: "#ff4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px" }}
              >
                Remove
              </button>
            </div>
            <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Network Name"
                value={network.name}
                onChange={(e) => {
                  const networks = [...(editedConfig.networks || [])];
                  networks[index] = { ...networks[index], name: e.target.value };
                  updateConfig('networks', networks);
                }}
              />
              <input
                type="text"
                placeholder="VNL"
                value={network.vnl || ''}
                onChange={(e) => {
                  const networks = [...(editedConfig.networks || [])];
                  networks[index] = { ...networks[index], vnl: e.target.value || undefined };
                  updateConfig('networks', networks);
                }}
              />
              <input
                type="text"
                placeholder="Switch"
                value={network.switch || ''}
                onChange={(e) => {
                  const networks = [...(editedConfig.networks || [])];
                  networks[index] = { ...networks[index], switch: e.target.value || undefined };
                  updateConfig('networks', networks);
                }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Port Forwards */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Port Forwards ({editedConfig.port_forwards?.length || 0})</h3>
        <button
          onClick={() => {
            const port_forwards = [...(editedConfig.port_forwards || [])];
            port_forwards.push({});
            updateConfig('port_forwards', port_forwards);
          }}
          style={{ marginBottom: "10px" }}
        >
          Add Port Forward
        </button>
        {(editedConfig.port_forwards || []).map((pf, index) => (
          <div key={index} style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "10px", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Port Forward {index + 1}</strong>
              <button
                onClick={() => {
                  const port_forwards = (editedConfig.port_forwards || []).filter((_, i) => i !== index);
                  updateConfig('port_forwards', port_forwards);
                }}
                style={{ background: "#ff4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px" }}
              >
                Remove
              </button>
            </div>
            <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: "10px" }}>
              <input
                type="number"
                placeholder="Guest Port"
                value={pf.guest || ''}
                onChange={(e) => {
                  const port_forwards = [...(editedConfig.port_forwards || [])];
                  port_forwards[index] = { ...port_forwards[index], guest: e.target.value ? parseInt(e.target.value) : undefined };
                  updateConfig('port_forwards', port_forwards);
                }}
              />
              <input
                type="number"
                placeholder="Host Port"
                value={pf.host || ''}
                onChange={(e) => {
                  const port_forwards = [...(editedConfig.port_forwards || [])];
                  port_forwards[index] = { ...port_forwards[index], host: e.target.value ? parseInt(e.target.value) : undefined };
                  updateConfig('port_forwards', port_forwards);
                }}
              />
              <input
                type="text"
                placeholder="Guest IP"
                value={pf.guest_ip || ''}
                onChange={(e) => {
                  const port_forwards = [...(editedConfig.port_forwards || [])];
                  port_forwards[index] = { ...port_forwards[index], guest_ip: e.target.value || undefined };
                  updateConfig('port_forwards', port_forwards);
                }}
              />
              <input
                type="text"
                placeholder="Host IP"
                value={pf.host_ip || ''}
                onChange={(e) => {
                  const port_forwards = [...(editedConfig.port_forwards || [])];
                  port_forwards[index] = { ...port_forwards[index], host_ip: e.target.value || undefined };
                  updateConfig('port_forwards', port_forwards);
                }}
              />
              <select
                value={pf.proto || ''}
                onChange={(e) => {
                  const port_forwards = [...(editedConfig.port_forwards || [])];
                  port_forwards[index] = { ...port_forwards[index], proto: e.target.value || undefined };
                  updateConfig('port_forwards', port_forwards);
                }}
              >
                <option value="">Default</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div style={{ marginTop: "10px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={pf.ignore || false}
                  onChange={(e) => {
                    const port_forwards = [...(editedConfig.port_forwards || [])];
                    port_forwards[index] = { ...port_forwards[index], ignore: e.target.checked };
                    updateConfig('port_forwards', port_forwards);
                  }}
                />
                Ignore
              </label>
              <label style={{ marginLeft: "20px" }}>
                <input
                  type="checkbox"
                  checked={pf.reverse || false}
                  onChange={(e) => {
                    const port_forwards = [...(editedConfig.port_forwards || [])];
                    port_forwards[index] = { ...port_forwards[index], reverse: e.target.checked };
                    updateConfig('port_forwards', port_forwards);
                  }}
                />
                Reverse
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* SSH Configuration */}
      <section style={{ marginBottom: "30px" }}>
        <h3>SSH Configuration</h3>
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <label>Local Port:</label>
            <input
              type="number"
              value={editedConfig.ssh?.local_port || ''}
              onChange={(e) => {
                updateConfig('ssh.local_port', e.target.value ? parseInt(e.target.value) : undefined);
              }}
              style={{ width: "100%", padding: "5px" }}
              placeholder="Default"
            />
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <label>
              <input
                type="checkbox"
                checked={editedConfig.ssh?.load_dot_ssh || false}
                onChange={(e) => {
                  updateConfig('ssh.load_dot_ssh', e.target.checked);
                }}
              />
              Load .SSH Config
            </label>
            <label>
              <input
                type="checkbox"
                checked={editedConfig.ssh?.forward_agent || false}
                onChange={(e) => {
                  updateConfig('ssh.forward_agent', e.target.checked);
                }}
              />
              Forward Agent
            </label>
            <label>
              <input
                type="checkbox"
                checked={editedConfig.ssh?.forward_x11 || false}
                onChange={(e) => {
                  updateConfig('ssh.forward_x11', e.target.checked);
                }}
              />
              Forward X11
            </label>
          </div>
        </div>
      </section>

      {/* Message */}
      <section style={{ marginBottom: "30px" }}>
        <h3>Message</h3>
        <textarea
          value={editedConfig.message}
          onChange={(e) => updateConfig('message', e.target.value)}
          style={{ width: "100%", minHeight: "100px", padding: "10px", fontFamily: "monospace" }}
          placeholder="Message to display after instance is ready"
        />
      </section>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "30px" }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: isSaving ? "not-allowed" : "pointer"
          }}
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
        <button
          onClick={handleReset}
          style={{
            background: "#9E9E9E",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Reset Changes
        </button>
      </div>
    </div>
  );
}