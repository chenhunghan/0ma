use futures_util::{SinkExt, StreamExt};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TerminalCommand {
    #[serde(rename = "resize")]
    Resize { cols: u16, rows: u16 },
}

pub struct TerminalService;

impl TerminalService {
    pub async fn start() -> Result<(u16, tokio::task::JoinHandle<()>), String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind to port: {}", e))?;
        let port = listener.local_addr().unwrap().port();

        println!("Terminal service listening on 127.0.0.1:{}", port);

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

    // The first message is the instance name.
    let instance_name = match ws_receiver.next().await {
        Some(Ok(Message::Text(name))) => name.to_string(),
        _ => return,
    };

    println!("Starting terminal for instance: {}", instance_name);

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
    cmd.arg(&instance_name);
    cmd.env("TERM", "xterm-256color");

    let _child = match pty_pair.slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(e) => {
            let _ = ws_sender
                .send(Message::Text(
                    format!("Error: Failed to spawn shell: {}", e).into(),
                ))
                .await;
            return;
        }
    };

    let mut reader = pty_pair.master.try_clone_reader().unwrap();
    let mut writer = pty_pair.master.take_writer().unwrap();
    let master = Arc::new(Mutex::new(pty_pair.master));

    // Channel for PTY to WS
    let (pty_to_ws_tx, mut pty_to_ws_rx) = tokio::sync::mpsc::channel::<Vec<u8>>(1024);

    // Thread for PTY reader (blocking IO)
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

    // Master clone for resizing
    let master_for_cmds = master.clone();

    // Task for WS to PTY (commands and user input)
    let ws_to_pty_task = tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Binary(data)) => {
                    if writer.write_all(&data).is_err() {
                        break;
                    }
                    let _ = writer.flush();
                }
                Ok(Message::Text(text)) => {
                    if let Ok(cmd) = serde_json::from_str::<TerminalCommand>(&text) {
                        match cmd {
                            TerminalCommand::Resize { cols, rows } => {
                                let master = master_for_cmds.lock().unwrap();
                                let _ = master.resize(PtySize {
                                    rows,
                                    cols,
                                    pixel_width: 0,
                                    pixel_height: 0,
                                });
                            }
                        }
                    } else if writer.write_all(text.as_bytes()).is_err() {
                        break;
                    }
                }
                _ => break,
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
    println!("Terminal session for {} ended", instance_name);
}
