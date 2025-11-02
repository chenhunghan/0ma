import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [limaVersion, setLimaVersion] = useState<string>("");
  const [limaError, setLimaError] = useState<string>("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  async function checkLima() {
    try {
      setLimaError("");
      const version = await invoke<string>("lima_version");
      setLimaVersion(version);
    } catch (error) {
      console.error("Error checking lima:", error);
      setLimaVersion("");
      setLimaError(String(error));
    }
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
        <button onClick={checkLima}>Check Lima</button>
        {limaVersion && (
          <p>✓ Lima version: {limaVersion}</p>
        )}
        {limaError && (
          <p style={{ color: 'red' }}>✗ Error: {limaError}</p>
        )}
      </div>
    </main>
  );
}

export default App;
