import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import "./App.css";
import reactLogo from "./assets/react.svg";
import { useLimaVersion } from "./hooks/useLimaVersion";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  const { limaVersion, limaVersionError, isLoadingLimaVersion, checkLimaVersion } =
    useLimaVersion();

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

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

export default App;
