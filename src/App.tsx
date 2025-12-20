import { invoke } from "@tauri-apps/api/core";
import { useLimaYaml } from "./hooks/useLimaYaml";
import { useLimaVersion } from "./hooks/useLimaVersion";
import { useLimaInstance } from "./hooks/useLimaInstance";
import { LimaConfig } from "./types/lima-config";
import { useState, useEffect } from "react";
import { LimaConfigEditor } from "./components/LimaConfigEditor";
import { QuickConfigEditor } from "./components/QuickConfigEditor";

export function App() {
  const { limaVersion, limaVersionError, isLoadingLimaVersion, checkLimaVersion } =
    useLimaVersion();

  const {
    limaConfig,
    limaError,
    isLoadingLima,
    refetchLima,
    writeLimaYaml,
    isWritingLima,
    writeLimaError,
    limaYamlPath,
    limaYamlPathError,
    isLoadingLimaYamlPath,
    fetchLimaYamlPath,
    resetLimaYaml,
    isResettingLima,
    resetLimaError,
  } = useLimaYaml();

  const { instanceStatus, startInstance, stopInstance, deleteInstance, clearStatus, isCreatingInstance } = useLimaInstance();

  const [showEditor, setShowEditor] = useState(false);
  const [editableConfig, setEditableConfig] = useState<LimaConfig | null>(null);
  const [instanceName, setInstanceName] = useState<string>("");

  // Convert config to YAML for display
  const [yamlDisplay, setYamlDisplay] = useState<string>("");

  // Update editable config when limaConfig changes
  useEffect(() => {
    if (limaConfig) {
      setEditableConfig({ ...limaConfig });
    }
  }, [limaConfig]);

  // Update display when config changes
  useEffect(() => {
    const updateDisplay = async () => {
      if (limaConfig) {
        try {
          // Convert config to YAML for display
          const yamlString = await invoke<string>("convert_config_to_yaml", { config: limaConfig });
          setYamlDisplay(yamlString);
        } catch (error) {
          // Fallback to JSON if YAML conversion fails
          console.error("Failed to convert to YAML:", error);
          setYamlDisplay(JSON.stringify(limaConfig, null, 2));
        }
      }
    };

    updateDisplay();
  }, [limaConfig]);

  const handleWriteTest = async () => {
    if (limaConfig) {
      // Modify the structured config
      const updatedConfig: LimaConfig = {
        ...limaConfig,
        message: `# Modified at ${new Date().toISOString()}\n${limaConfig.message}`,
      };
      writeLimaYaml(updatedConfig);
    }
  };

  const handleCreateInstance = async () => {
    if (editableConfig) {
      await startInstance(editableConfig, instanceName || undefined);
    }
  };

  return (
    <main style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>Lima Manager</h1>

      {/* Lima Version Section */}
      <section style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Lima Version</h2>
        <div className="row">
          <button onClick={() => checkLimaVersion()} disabled={isLoadingLimaVersion}>
            {isLoadingLimaVersion ? "Checking..." : "Check Lima Version"}
          </button>
          {limaVersion && <p>✓ Lima version: {limaVersion}</p>}
          {limaVersionError && (
            <p style={{ color: "red" }}>✗ Error: {String(limaVersionError)}</p>
          )}
        </div>
      </section>

      {/* Lima Configuration Section */}
      <section style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Lima Configuration</h2>
        
        <div style={{ marginBottom: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => refetchLima()} disabled={isLoadingLima}>
            {isLoadingLima ? "Loading..." : "Load Lima YAML"}
          </button>
          
          <button 
            onClick={() => fetchLimaYamlPath()} 
            disabled={isLoadingLimaYamlPath}
          >
            {isLoadingLimaYamlPath ? "Loading Path..." : "Get YAML Path"}
          </button>
          
          <button
            onClick={handleWriteTest}
            disabled={isWritingLima || !limaConfig}
          >
            {isWritingLima ? "Writing..." : "Test Write (Add Timestamp)"}
          </button>

          <button
            onClick={() => resetLimaYaml()}
            disabled={isResettingLima}
            style={{
              background: "#ff6b6b",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: isResettingLima ? "not-allowed" : "pointer"
            }}
          >
            {isResettingLima ? "Resetting..." : "Reset to Default"}
          </button>

          <button
            onClick={() => setShowEditor(!showEditor)}
            disabled={!limaConfig}
            style={{
              background: showEditor ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: !limaConfig ? "not-allowed" : "pointer"
            }}
          >
            {showEditor ? "Hide Editor" : "Edit Configuration"}
          </button>

          <button
            onClick={handleCreateInstance}
            disabled={!editableConfig || isCreatingInstance || instanceStatus.isStarting}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (!editableConfig || isCreatingInstance || instanceStatus.isStarting) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting ? "Starting..." : "Create Lima Instance"}
          </button>

          <button
            onClick={() => {
              const name = instanceName || editableConfig?.name || "default";
              stopInstance(name);
            }}
            disabled={isCreatingInstance || instanceStatus.isStarting}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (isCreatingInstance || instanceStatus.isStarting) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting ? "Stopping..." : "Stop Lima Instance"}
          </button>

          <button
            onClick={() => {
              const name = instanceName || editableConfig?.name || "default";
              if (confirm(`Are you sure you want to permanently delete the Lima instance '${name}'? This action cannot be undone.`)) {
                deleteInstance(name);
              }
            }}
            disabled={isCreatingInstance || instanceStatus.isStarting}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (isCreatingInstance || instanceStatus.isStarting) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting ? "Deleting..." : "Delete Lima Instance"}
          </button>

          {instanceStatus.error && (
            <button
              onClick={clearStatus}
              style={{
                background: "#ffc107",
                color: "black",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Clear Status
            </button>
          )}
        </div>

        {/* Instance Name Input */}
        <div style={{ marginTop: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Instance Name (optional):
          </label>
          <input
            type="text"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            placeholder={editableConfig?.name || "default"}
            style={{
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "300px"
            }}
          />
        </div>

        {limaYamlPath && (
          <div style={{ marginBottom: "10px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
            <strong>File Path:</strong> <code>{limaYamlPath}</code>
          </div>
        )}

        {limaYamlPathError && (
          <p style={{ color: "red" }}>✗ Path Error: {String(limaYamlPathError)}</p>
        )}

        {limaError && (
          <p style={{ color: "red" }}>✗ Error: {String(limaError)}</p>
        )}

        {writeLimaError && (
          <p style={{ color: "red" }}>✗ Write Error: {String(writeLimaError)}</p>
        )}

        {resetLimaError && (
          <p style={{ color: "red" }}>✗ Reset Error: {String(resetLimaError)}</p>
        )}

        {/* Instance Status */}
        {(instanceStatus.isStarting || instanceStatus.output.length > 0 || instanceStatus.error || instanceStatus.success) && (
          <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", background: "#f9f9f9" }}>
            <h3>Instance Status</h3>

            {instanceStatus.isStarting && (
              <div style={{ marginBottom: "10px", color: "#007bff" }}>
                ⏳ Operation in progress...
              </div>
            )}

            {instanceStatus.output.length > 0 && (
              <div style={{ marginBottom: "15px" }}>
                <strong>Output:</strong>
                <pre style={{
                  background: "#1e1e1e",
                  color: "#d4d4d4",
                  padding: "10px",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxHeight: "300px",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  marginTop: "5px"
                }}>
                  {instanceStatus.output.join('\n')}
                </pre>
              </div>
            )}

            {instanceStatus.success && (
              <div style={{ marginBottom: "10px", color: "#28a745", fontWeight: "bold" }}>
                ✅ {instanceStatus.success}
              </div>
            )}

            {instanceStatus.error && (
              <div style={{ marginBottom: "10px", color: "#dc3545" }}>
                ❌ <strong>Error:</strong> {instanceStatus.error}
              </div>
            )}
          </div>
        )}

        {editableConfig && !showEditor && (
          <QuickConfigEditor
            config={editableConfig}
            onChange={setEditableConfig}
          />
        )}

        {yamlDisplay && (
          <div style={{ marginTop: "15px" }}>
            <h3>YAML Configuration:</h3>
            <pre style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: "15px",
              borderRadius: "4px",
              overflow: "auto",
              maxHeight: "500px",
              fontSize: "12px",
              lineHeight: "1.5"
            }}>
              {yamlDisplay}
            </pre>
          </div>
        )}

        {limaConfig && !showEditor && (
          <div style={{ marginTop: "15px" }}>
            <h3>Configuration Summary:</h3>
            <div style={{ padding: "10px", background: "#f8f8f8", borderRadius: "4px" }}>
              <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
                <li>Mounts: {limaConfig.mounts?.length || 0} configured</li>
                <li>Networks: {limaConfig.networks?.length || 0} configured</li>
                <li>Port Forwards: {limaConfig.port_forwards?.length || 0} configured</li>
                <li>Provision Scripts: {limaConfig.provision?.length || 0} scripts</li>
                <li>Probes: {limaConfig.probes?.length || 0} probes</li>
                <li>Copy To Host: {limaConfig.copy_to_host?.length || 0} items</li>
                <li>Copy From Host: {limaConfig.copy_from_host?.length || 0} items</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Configuration Editor Section */}
      {showEditor && editableConfig && (
        <section style={{ marginBottom: "30px", padding: "15px", border: "2px solid #007bff", borderRadius: "8px" }}>
          <LimaConfigEditor
            config={editableConfig}
            onSave={writeLimaYaml}
            isSaving={isWritingLima}
          />
        </section>
      )}
    </main>
  );
}
