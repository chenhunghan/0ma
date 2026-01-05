use futures_util::{SinkExt, StreamExt};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LogCommand {
    #[serde(rename = "resize")]
    Resize { cols: u16, rows: u16 },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct K8sLogRequest {
    pub instance: String,
    pub pod: String,
    pub namespace: String,
}

pub struct K8sLogService;

impl K8sLogService {
    pub async fn start() -> Result<(u16, tokio::task::JoinHandle<()>), String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind to port: {}", e))?;
        let port = listener.local_addr().unwrap().port();

        log::info!("K8s Log service listening on 127.0.0.1:{}", port);

        let handle = tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                tokio::spawn(async move {
                    if let Ok(ws_stream) = accept_async(stream).await {
                        handle_connection(ws_stream).await;
                    }
                });
            }
        });

        Ok((port, handle))
    }
}

async fn handle_connection(ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Handshake: Expect JSON with instance, pod, namespace
    let handshake_text = match ws_receiver.next().await {
        Some(Ok(Message::Text(text))) => text,
        _ => return,
    };

    log::info!("Log connection handshake: {}", handshake_text);

    let request = match serde_json::from_str::<K8sLogRequest>(&handshake_text) {
        Ok(req) => req,
        Err(e) => {
            let _ = ws_sender
                .send(Message::Text(
                    format!("Error: Invalid handshake: {}", e).into(),
                ))
                .await;
            return;
        }
    };

    log::info!(
        "Starting logs for pod {} in {} on instance {}",
        request.pod,
        request.namespace,
        request.instance
    );

    let pty_system = NativePtySystem::default();
    let pty_pair = match pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }) {
        Ok(pair) => pair,
        Err(e) => {
            let _ = ws_sender
                .send(Message::Text(
                    format!("Error: Failed to open PTY: {}", e).into(),
                ))
                .await;
            return;
        }
    };

    // Find limactl
    let lima_cmd = crate::find_lima_executable().unwrap_or_else(|| "limactl".to_string());

    let mut cmd = CommandBuilder::new(lima_cmd);
    cmd.arg("shell");
    cmd.arg(&request.instance);

    // Script to detect k0s and run kubectl logs
    // We use -f for follow
    let script = format!(
        r#"if command -v k0s >/dev/null 2>&1; then k0s kubectl logs -f -n {} {}; else kubectl logs -f -n {} {}; fi"#,
        request.namespace, request.pod, request.namespace, request.pod
    );

    cmd.arg("sh");
    cmd.arg("-c");
    cmd.arg(script);

    // TERM=xterm-256color for color output
    cmd.env("TERM", "xterm-256color");

    let _child = match pty_pair.slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(e) => {
            let _ = ws_sender
                .send(Message::Text(
                    format!("Error: Failed to spawn logs: {}", e).into(),
                ))
                .await;
            return;
        }
    };

    let mut reader = pty_pair.master.try_clone_reader().unwrap();
    // We don't take the writer because this is read-only for the user (except resize)
    let master = Arc::new(Mutex::new(pty_pair.master));

    // Channel for PTY output to WS
    let (pty_to_ws_tx, mut pty_to_ws_rx) = tokio::sync::mpsc::channel::<Vec<u8>>(1024);

    // Thread for reading PTY output
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if pty_to_ws_tx.blocking_send(buf[..n].to_vec()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    let master_for_cmds = master.clone();

    // Task for handling WS messages (Resize only, ignore others)
    let ws_to_pty_task = tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(cmd) = serde_json::from_str::<LogCommand>(&text) {
                        match cmd {
                            LogCommand::Resize { cols, rows } => {
                                let master = master_for_cmds.lock().unwrap();
                                let _ = master.resize(PtySize {
                                    rows,
                                    cols,
                                    pixel_width: 0,
                                    pixel_height: 0,
                                });
                            }
                        }
                    }
                }
                _ => {} // Ignore binary or other messages
            }
        }
    });

    // Loop for sending PTY output to WS
    while let Some(data) = pty_to_ws_rx.recv().await {
        if ws_sender.send(Message::Binary(data.into())).await.is_err() {
            break;
        }
    }

    ws_to_pty_task.abort();
    log::info!("Log session ended");
}
