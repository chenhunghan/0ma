import { invoke } from "@tauri-apps/api/core";
import { useLimaYaml } from "./hooks/useLimaYaml";
import { useLimaVersion } from "./hooks/useLimaVersion";
import { useLimaInstance } from "./hooks/useLimaInstance";
import { useInstanceRegistry } from "./hooks/useInstanceRegistry";
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

  const { instanceStatus, startInstance, stopInstance, deleteInstance, clearStatus: clearInstanceStatus, isCreatingInstance } = useLimaInstance();
  const { instances: registeredInstances } = useInstanceRegistry();

  const [showEditor, setShowEditor] = useState(false);
  const [editableConfig, setEditableConfig] = useState<LimaConfig | null>(null);
  const [instanceName, setInstanceName] = useState<string>("");

  // On app startup, if there's no current instance tracked in memory,
  // try to restore the most recently created instance from the registry
  useEffect(() => {
    if (!instanceStatus.currentInstanceName && registeredInstances.length > 0) {
      // Clear any stale status on startup
      clearInstanceStatus();
      // Note: We could load the last instance into currentInstanceName here
      // but it's better to let the user explicitly select which instance to work with
    }
  }, [registeredInstances, instanceStatus.currentInstanceName, clearInstanceStatus]);

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
      // Always provide an instance name - use the input, config name, or generate a unique one
      const nameToUse = instanceName || editableConfig.name || `zeroma-${Date.now()}`;
      await startInstance(editableConfig, nameToUse);
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
            disabled={!editableConfig || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error}
            style={{
              background: instanceStatus.error ? "#dc3545" : "#28a745",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (!editableConfig || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting
              ? "Starting..."
              : instanceStatus.error
                ? "Clear Error to Retry"
                : "Create Lima Instance"
            }
          </button>

          <button
            onClick={() => {
              if (instanceStatus.currentInstanceName) {
                stopInstance(instanceStatus.currentInstanceName);
              }
            }}
            disabled={!instanceStatus.currentInstanceName || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error}
            style={{
              background: !instanceStatus.currentInstanceName || instanceStatus.error ? "#6c757d" : "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (!instanceStatus.currentInstanceName || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting
              ? "Stopping..."
              : instanceStatus.error
                ? "Clear Error First"
                : !instanceStatus.currentInstanceName
                  ? "No Instance to Stop"
                  : `Stop Instance (${instanceStatus.currentInstanceName})`
            }
          </button>

          <button
            onClick={() => {
              if (instanceStatus.currentInstanceName &&
                  confirm(`Are you sure you want to permanently delete the Lima instance '${instanceStatus.currentInstanceName}'? This action cannot be undone.`)) {
                deleteInstance(instanceStatus.currentInstanceName);
              }
            }}
            disabled={!instanceStatus.currentInstanceName || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error}
            style={{
              background: !instanceStatus.currentInstanceName || instanceStatus.error ? "#6c757d" : "#ffc107",
              color: (!instanceStatus.currentInstanceName || instanceStatus.error) ? "white" : "black",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: (!instanceStatus.currentInstanceName || isCreatingInstance || instanceStatus.isStarting || !!instanceStatus.error) ? "not-allowed" : "pointer"
            }}
          >
            {isCreatingInstance || instanceStatus.isStarting
              ? "Deleting..."
              : instanceStatus.error
                ? "Clear Error First"
                : !instanceStatus.currentInstanceName
                  ? "No Instance to Delete"
                  : `Delete Instance (${instanceStatus.currentInstanceName})`
            }
          </button>
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
          <small style={{ color: "#666", fontSize: "12px", marginTop: "3px", display: "block" }}>
            If empty, a unique name will be generated automatically (e.g., zeroma-1734738140)
          </small>
        </div>

        {limaYamlPath && (
          <div style={{ marginBottom: "10px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
            <strong>File Path:</strong> <code>{limaYamlPath}</code>
          </div>
        )}

        {/* Registered Instances Section */}
        {registeredInstances.length > 0 && (
          <div style={{ marginTop: "15px", padding: "10px", background: "#e8f5e8", border: "1px solid #c3e6cb", borderRadius: "4px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>ZeroMa-Managed Instances:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {registeredInstances
                .sort((a, b) => parseInt(b.created_at) - parseInt(a.created_at))
                .map((instance) => (
                  <div
                    key={instance.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 10px",
                      background: instance.name === instanceStatus.currentInstanceName ? "#d4edda" : "white",
                      borderRadius: "3px",
                      border: instance.name === instanceStatus.currentInstanceName ? "1px solid #c3e6cb" : "1px solid #dee2e6"
                    }}
                  >
                    <span>
                      <strong>{instance.name}</strong>
                      <small style={{ marginLeft: "10px", color: "#666" }}>
                        Created: {new Date(parseInt(instance.created_at) * 1000).toLocaleString()}
                      </small>
                    </span>
                    {instance.name === instanceStatus.currentInstanceName && (
                      <span style={{ fontSize: "12px", color: "#155724", fontWeight: "bold" }}>
                        [Active]
                      </span>
                    )}
                  </div>
                ))}
            </div>
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
                {instanceStatus.currentInstanceName && (
                  <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                    Instance: {instanceStatus.currentInstanceName}
                  </span>
                )}
              </div>
            )}

            {instanceStatus.currentInstanceName && !instanceStatus.isStarting && !instanceStatus.error && (
              <div style={{ marginBottom: "10px", padding: "8px", background: "#e7f3ff", border: "1px solid #b3d9ff", borderRadius: "4px" }}>
                <strong>Active Instance:</strong> {instanceStatus.currentInstanceName}
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
              <div style={{ marginBottom: "10px", padding: "10px", background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "4px", color: "#155724" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    ✅ <strong>Success:</strong> {instanceStatus.success}
                  </div>
                  <button
                    onClick={clearInstanceStatus}
                    style={{
                      marginLeft: "10px",
                      padding: "4px 12px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#218838"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#28a745"}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {instanceStatus.error && (
              <div style={{ marginBottom: "10px", padding: "10px", background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "4px", color: "#721c24" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    ❌ <strong>Error:</strong> {instanceStatus.error}
                  </div>
                  <button
                    onClick={clearInstanceStatus}
                    style={{
                      marginLeft: "10px",
                      padding: "4px 12px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#c82333"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#dc3545"}
                  >
                    Clear & Retry
                  </button>
                </div>
                <div style={{ marginTop: "8px", fontSize: "14px" }}>
                  Please check the error details above and fix any configuration issues before retrying.
                </div>
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
