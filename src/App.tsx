import { useLimaVersion } from "./hooks/useLimaVersion";

export function App() {

  const { limaVersion, limaVersionError, isLoadingLimaVersion, checkLimaVersion } =
    useLimaVersion();

  return (
    <main>

      <div className="row">
        <button onClick={() => checkLimaVersion()} disabled={isLoadingLimaVersion}>
          {isLoadingLimaVersion ? "Checking..." : "Check Lima"}
        </button>
        {limaVersion && <p>✓ Lima version: {limaVersion}</p>}
        {limaVersionError && (
          <p style={{ color: "red" }}>✗ Error: {String(limaVersionError)}</p>
        )}
      </div>
    </main>
  );
}
