import { useState } from 'react';
import { LimaConfig } from '../types/LimaConfig';

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
            <label>VM Type:</label>
            <input
              type="text"
              value={editedConfig.vm_type || ''}
              onChange={(e) => updateConfig('vm_type', e.target.value || undefined)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="vz, qemu, krunkit"
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
            <label>Memory (e.g., "4GiB", "8GB"):</label>
            <input
              type="text"
              value={editedConfig.memory || ''}
              onChange={(e) => updateConfig('memory', e.target.value || undefined)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="4GiB"
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