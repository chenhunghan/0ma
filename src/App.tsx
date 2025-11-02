import { useLimaK8sYaml } from "./hooks/useLimaK8sYaml";
import { useLimaVersion } from "./hooks/useLimaVersion";

export function App() {
  const { limaVersion, limaVersionError, isLoadingLimaVersion, checkLimaVersion } =
    useLimaVersion();

  const {
    limaK8sYamlContent,
    limaK8sYamlError,
    isLoadingLimaK8sYaml,
    refetchLimaK8sYaml,
    writeLimaK8sYaml,
    isWritingLimaK8sYaml,
    writeLimaK8sYamlError,
    limaK8sYamlPath,
    limaK8sYamlPathError,
    isLoadingLimaK8sYamlPath,
    fetchLimaK8sYamlPath,
  } = useLimaK8sYaml();

  const handleWriteTest = () => {
    if (limaK8sYamlContent) {
      // Add a comment to test write functionality
      const updatedContent = `# Modified at ${new Date().toISOString()}\n${limaK8sYamlContent}`;
      writeLimaK8sYaml(updatedContent);
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

      {/* K8s YAML Section */}
      <section style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Lima K8s YAML</h2>
        
        <div style={{ marginBottom: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => refetchLimaK8sYaml()} disabled={isLoadingLimaK8sYaml}>
            {isLoadingLimaK8sYaml ? "Loading..." : "Load K8s YAML"}
          </button>
          
          <button 
            onClick={() => fetchLimaK8sYamlPath()} 
            disabled={isLoadingLimaK8sYamlPath}
          >
            {isLoadingLimaK8sYamlPath ? "Loading Path..." : "Get YAML Path"}
          </button>
          
          <button 
            onClick={handleWriteTest} 
            disabled={isWritingLimaK8sYaml || !limaK8sYamlContent}
          >
            {isWritingLimaK8sYaml ? "Writing..." : "Test Write (Add Timestamp)"}
          </button>
        </div>

        {limaK8sYamlPath && (
          <div style={{ marginBottom: "10px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
            <strong>File Path:</strong> <code>{limaK8sYamlPath}</code>
          </div>
        )}

        {limaK8sYamlPathError && (
          <p style={{ color: "red" }}>✗ Path Error: {String(limaK8sYamlPathError)}</p>
        )}

        {limaK8sYamlError && (
          <p style={{ color: "red" }}>✗ Error: {String(limaK8sYamlError)}</p>
        )}

        {writeLimaK8sYamlError && (
          <p style={{ color: "red" }}>✗ Write Error: {String(writeLimaK8sYamlError)}</p>
        )}

        {limaK8sYamlContent && (
          <div style={{ marginTop: "15px" }}>
            <h3>YAML Content ({limaK8sYamlContent.length} characters):</h3>
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
              {limaK8sYamlContent}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
