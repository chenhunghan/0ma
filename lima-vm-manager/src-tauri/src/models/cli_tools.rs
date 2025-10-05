use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CLITool {
    pub name: String,
    pub path: PathBuf,
    pub version: String,
    pub minimum_version: String,
    pub is_available: bool,
    pub version_valid: bool,
    pub last_checked: DateTime<Utc>,
    pub install_url: Option<String>,
    pub description: String,
    pub commands: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CLIDetectionConfig {
    pub auto_refresh: bool,
    pub refresh_interval_secs: u64,
    pub cache_enabled: bool,
    pub timeout_secs: u64,
    pub additional_paths: Vec<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CLIToolStatus {
    pub limactl: CLITool,
    pub kubectl: CLITool,
    pub git: CLITool,
    pub docker: CLITool,
    pub qemu: CLITool,
    pub all_tools_available: bool,
    pub last_detection: DateTime<Utc>,
    pub detection_duration_ms: u64,
    pub errors: Vec<String>,
    pub config: CLIDetectionConfig,
}

impl CLITool {
    pub fn new(name: &str, minimum_version: &str, description: &str) -> Self {
        Self {
            name: name.to_string(),
            path: PathBuf::new(),
            version: String::new(),
            minimum_version: minimum_version.to_string(),
            is_available: false,
            version_valid: false,
            last_checked: Utc::now(),
            install_url: get_install_url(name),
            description: description.to_string(),
            commands: get_common_commands(name),
        }
    }

    pub fn with_config(name: &str, minimum_version: &str, description: &str, _config: &CLIDetectionConfig) -> Self {
        let tool = Self::new(name, minimum_version, description);
        tool
    }

    pub fn is_stale(&self, config: &CLIDetectionConfig) -> bool {
        if !config.cache_enabled {
            return true;
        }

        let elapsed = Utc::now().signed_duration_since(self.last_checked);
        elapsed.num_seconds() > config.refresh_interval_secs as i64
    }

    pub fn detect(&mut self) -> Result<(), String> {
        self.detect_with_timeout(10) // Default 10 second timeout
    }

    pub fn detect_with_timeout(&mut self, timeout_secs: u64) -> Result<(), String> {
        // Try to find the CLI tool in PATH
        let output = Command::new("which")
            .arg(&self.name)
            .output()
            .map_err(|e| format!("Failed to execute which: {}", e))?;

        if output.status.success() {
            let path_str = String::from_utf8(output.stdout)
                .map_err(|e| format!("Invalid UTF-8 in path: {}", e))?
                .trim()
                .to_string();

            self.path = PathBuf::from(path_str);
            self.is_available = true;
            self.last_checked = Utc::now();

            // Get version with timeout
            self.get_version_with_timeout(timeout_secs)?;
            self.validate_version()?;
        } else {
            self.is_available = false;
            self.last_checked = Utc::now();
            return Err(format!("{} not found in PATH", self.name));
        }

        Ok(())
    }

    pub fn detect_in_paths(&mut self, search_paths: &[PathBuf]) -> Result<(), String> {
        // Search in custom paths first
        for path in search_paths {
            let tool_path = path.join(&self.name);
            if tool_path.exists() && tool_path.is_file() {
                self.path = tool_path;
                self.is_available = true;
                self.last_checked = Utc::now();

                // Get version
                self.get_version()?;
                self.validate_version()?;
                return Ok(());
            }
        }

        // Fall back to PATH search
        self.detect()
    }

    fn get_version(&mut self) -> Result<(), String> {
        self.get_version_with_timeout(10)
    }

    fn get_version_with_timeout(&mut self, _timeout_secs: u64) -> Result<(), String> {
        let mut command = Command::new(&self.name);

        match self.name.as_str() {
            "limactl" => {
                command.arg("--version");
            }
            "kubectl" => {
                command.arg("version").arg("--client").arg("--short");
            }
            "git" => {
                command.arg("--version");
            }
            "docker" => {
                command.arg("--version");
            }
            "qemu" => {
                command.arg("--version");
            }
            _ => return Err(format!("Unknown CLI tool: {}", self.name)),
        };

        let output = command
            .output()
            .map_err(|e| format!("Failed to get {} version: {}", self.name, e))?;

        if output.status.success() {
            let version_output = String::from_utf8(output.stdout)
                .map_err(|e| format!("Invalid UTF-8 in version output: {}", e))?
                .trim()
                .to_string();

            self.version = self.parse_version(&version_output)?;
        } else {
            return Err(format!("Failed to get {} version", self.name));
        }

        Ok(())
    }

    fn parse_version(&self, output: &str) -> Result<String, String> {
        match self.name.as_str() {
            "limactl" => {
                // limactl version output: "limactl version 0.12.0"
                if let Some(captures) = regex::Regex::new(r"limactl version (\d+\.\d+\.\d+)")
                    .map_err(|e| format!("Invalid regex: {}", e))?
                    .captures(output)
                {
                    Ok(captures.get(1).unwrap().as_str().to_string())
                } else {
                    Err(format!("Failed to parse limactl version from: {}", output))
                }
            }
            "kubectl" => {
                // kubectl version output: "Client Version: v1.28.0"
                if let Some(captures) = regex::Regex::new(r"Client Version: v?(\d+\.\d+\.\d+)")
                    .map_err(|e| format!("Invalid regex: {}", e))?
                    .captures(output)
                {
                    Ok(captures.get(1).unwrap().as_str().to_string())
                } else {
                    Err(format!("Failed to parse kubectl version from: {}", output))
                }
            }
            "git" => {
                // git version output: "git version 2.39.0" or "git version 2.38.1.apple.1"
                if let Some(captures) = regex::Regex::new(r"git version (\d+\.\d+\.\d+)")
                    .map_err(|e| format!("Invalid regex: {}", e))?
                    .captures(output)
                {
                    Ok(captures.get(1).unwrap().as_str().to_string())
                } else {
                    Err(format!("Failed to parse git version from: {}", output))
                }
            }
            "docker" => {
                // docker version output: "Docker version 24.0.2, build abc1234"
                if let Some(captures) = regex::Regex::new(r"Docker version (\d+\.\d+\.\d+)")
                    .map_err(|e| format!("Invalid regex: {}", e))?
                    .captures(output)
                {
                    Ok(captures.get(1).unwrap().as_str().to_string())
                } else {
                    Err(format!("Failed to parse docker version from: {}", output))
                }
            }
            "qemu" => {
                // qemu version output varies by platform:
                // macOS: "QEMU emulator version 8.1.1"
                // Linux: "QEMU emulator version 7.2.0 (Debian)"
                if let Some(captures) = regex::Regex::new(r"QEMU emulator version (\d+\.\d+\.\d+)")
                    .map_err(|e| format!("Invalid regex: {}", e))?
                    .captures(output)
                {
                    Ok(captures.get(1).unwrap().as_str().to_string())
                } else {
                    Err(format!("Failed to parse qemu version from: {}", output))
                }
            }
            _ => Err(format!("Cannot parse version for unknown tool: {}", self.name)),
        }
    }

    fn validate_version(&mut self) -> Result<(), String> {
        if self.version.is_empty() {
            return Err("Version not available".to_string());
        }

        let current = self.parse_version_requirement(&self.version)?;
        let minimum = self.parse_version_requirement(&self.minimum_version)?;

        self.version_valid = current >= minimum;

        if !self.version_valid {
            return Err(format!(
                "{} version {} is below minimum required version {}",
                self.name, self.version, self.minimum_version
            ));
        }

        Ok(())
    }

    pub fn parse_version_requirement(&self, version: &str) -> Result<(u32, u32, u32), String> {
        let parts: Vec<&str> = version.split('.').collect();
        if parts.len() != 3 {
            return Err(format!("Invalid version format: {}", version));
        }

        let major = parts[0]
            .parse::<u32>()
            .map_err(|e| format!("Invalid major version: {}", e))?;
        let minor = parts[1]
            .parse::<u32>()
            .map_err(|e| format!("Invalid minor version: {}", e))?;
        let patch = parts[2]
            .parse::<u32>()
            .map_err(|e| format!("Invalid patch version: {}", e))?;

        Ok((major, minor, patch))
    }
}

impl CLIToolStatus {
    pub fn new() -> Self {
        Self {
            limactl: CLITool::new("limactl", "1.2.0", "Lima VM control tool"),
            kubectl: CLITool::new("kubectl", "1.28.0", "Kubernetes command-line tool"),
            git: CLITool::new("git", "2.30.0", "Git version control system"),
            docker: CLITool::new("docker", "20.10.0", "Docker container platform"),
            qemu: CLITool::new("qemu", "7.0.0", "QEMU emulator"),
            all_tools_available: false,
            last_detection: Utc::now(),
            detection_duration_ms: 0,
            errors: Vec::new(),
            config: CLIDetectionConfig::default(),
        }
    }

    pub fn detect_all(&mut self) -> Result<(), String> {
        let start_time = std::time::Instant::now();

        let limactl_result = self.limactl.detect();
        let kubectl_result = self.kubectl.detect();
        let git_result = self.git.detect();
        let docker_result = self.docker.detect();
        let qemu_result = self.qemu.detect();

        // Log results for debugging
        match &limactl_result {
            Ok(_) => println!("limactl detected: {}", self.limactl.version),
            Err(e) => println!("limactl detection failed: {}", e),
        }

        match &kubectl_result {
            Ok(_) => println!("kubectl detected: {}", self.kubectl.version),
            Err(e) => println!("kubectl detection failed: {}", e),
        }

        match &git_result {
            Ok(_) => println!("git detected: {}", self.git.version),
            Err(e) => println!("git detection failed: {}", e),
        }

        match &docker_result {
            Ok(_) => println!("docker detected: {}", self.docker.version),
            Err(e) => println!("docker detection failed: {}", e),
        }

        match &qemu_result {
            Ok(_) => println!("qemu detected: {}", self.qemu.version),
            Err(e) => println!("qemu detection failed: {}", e),
        }

        self.all_tools_available = self.limactl.is_available
            && self.kubectl.is_available
            && self.git.is_available
            && self.docker.is_available
            && self.qemu.is_available
            && self.limactl.version_valid
            && self.kubectl.version_valid
            && self.git.version_valid
            && self.docker.version_valid
            && self.qemu.version_valid;

        self.detection_duration_ms = start_time.elapsed().as_millis() as u64;
        self.last_detection = Utc::now();

        if !self.all_tools_available {
            let mut errors = Vec::new();

            if let Err(e) = limactl_result {
                errors.push(format!("limactl: {}", e));
            } else if !self.limactl.version_valid {
                errors.push(format!("limactl version {} is below required 1.2.0", self.limactl.version));
            }

            if let Err(e) = kubectl_result {
                errors.push(format!("kubectl: {}", e));
            } else if !self.kubectl.version_valid {
                errors.push(format!("kubectl version {} is below required 1.28.0", self.kubectl.version));
            }

            if let Err(e) = git_result {
                errors.push(format!("git: {}", e));
            } else if !self.git.version_valid {
                errors.push(format!("git version {} is below required 2.30.0", self.git.version));
            }

            if let Err(e) = docker_result {
                errors.push(format!("docker: {}", e));
            } else if !self.docker.version_valid {
                errors.push(format!("docker version {} is below required 20.10.0", self.docker.version));
            }

            if let Err(e) = qemu_result {
                errors.push(format!("qemu: {}", e));
            } else if !self.qemu.version_valid {
                errors.push(format!("qemu version {} is below required 7.0.0", self.qemu.version));
            }

            self.errors = errors.clone();
            return Err(errors.join("; "));
        }

        self.errors.clear();
        Ok(())
    }
}

impl Default for CLIDetectionConfig {
    fn default() -> Self {
        Self {
            auto_refresh: true,
            refresh_interval_secs: 300, // 5 minutes
            cache_enabled: true,
            timeout_secs: 10,
            additional_paths: Vec::new(),
        }
    }
}

impl Default for CLIToolStatus {
    fn default() -> Self {
        Self::new()
    }
}

// Helper functions for CLI tool metadata
fn get_install_url(tool_name: &str) -> Option<String> {
    match tool_name {
        "limactl" => Some("https://github.com/lima-vm/lima/releases".to_string()),
        "kubectl" => Some("https://kubernetes.io/docs/tasks/tools/install-kubectl/".to_string()),
        "git" => Some("https://git-scm.com/downloads".to_string()),
        "docker" => Some("https://docs.docker.com/get-docker/".to_string()),
        "qemu" => Some("https://www.qemu.org/download/".to_string()),
        _ => None,
    }
}

fn get_common_commands(tool_name: &str) -> Vec<String> {
    match tool_name {
        "limactl" => vec![
            "limactl start".to_string(),
            "limactl stop".to_string(),
            "limactl list".to_string(),
            "limactl delete".to_string(),
        ],
        "kubectl" => vec![
            "kubectl get pods".to_string(),
            "kubectl apply -f".to_string(),
            "kubectl delete".to_string(),
            "kubectl logs".to_string(),
        ],
        "git" => vec![
            "git clone".to_string(),
            "git commit".to_string(),
            "git push".to_string(),
            "git pull".to_string(),
        ],
        "docker" => vec![
            "docker run".to_string(),
            "docker build".to_string(),
            "docker ps".to_string(),
            "docker exec".to_string(),
        ],
        "qemu" => vec![
            "qemu-system-x86_64".to_string(),
            "qemu-img create".to_string(),
            "qemu-img info".to_string(),
            "qemu-nbd".to_string(),
        ],
        _ => vec![],
    }
}