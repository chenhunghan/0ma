use crate::lima_config::LimaConfig;
use crate::yaml_handler::{get_instance_dir, get_yaml_path, write_yaml};
use std::os::unix::fs::PermissionsExt;
use tauri::{AppHandle, Manager};

/// The standard filename for Lima configuration for an instance
/// limactl uses `~/.lima/<instance_name>/lima.yaml` by default
const LIMA_CONFIG_FILENAME: &str = "lima.yaml";

/// Write YAML with for a specific instance (internal)
pub fn write_lima_yaml<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: &LimaConfig,
    instance_name: &str,
) -> Result<(), String> {
    // Write the config
    let yaml_content = config
        .to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    write_yaml(app, instance_name, LIMA_CONFIG_FILENAME, yaml_content)
}

/// Get the path to the Lima YAML configuration file for an instance
pub fn get_lima_yaml_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<std::path::PathBuf, String> {
    get_yaml_path(app, instance_name, LIMA_CONFIG_FILENAME)
}

/// Get the kubeconfig path for a specific instance (internal)
/// Uses Lima instance directory: ~/.lima/<instance_name>/kubeconfig.yaml
pub fn get_kubeconfig_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<std::path::PathBuf, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join("kubeconfig.yaml"))
}

/// Write env.sh and env.fish for a specific instance into the Lima instance directory.
/// Returns the absolute path to the shell-appropriate file (env.fish for fish, env.sh otherwise).
pub fn write_env_sh<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<String, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;

    // Write POSIX shell version (bash/zsh)
    let env_sh_path = instance_dir.join("env.sh");
    let sh_contents = format!(
        r#"#!/bin/bash
# 0ma environment for instance {name}
export KUBECONFIG="$HOME/.lima/{name}/kubeconfig.yaml"
export DOCKER_HOST="unix://$HOME/.lima/{name}/docker.sock"

# Symlink kubeconfig to ~/.kube/ for tools like Lens
if [ ! -L "$HOME/.kube/{name}" ]; then
  mkdir -p "$HOME/.kube"
  ln -sf "$HOME/.lima/{name}/kubeconfig.yaml" "$HOME/.kube/{name}"
fi
"#,
        name = instance_name
    );

    std::fs::write(&env_sh_path, &sh_contents)
        .map_err(|e| format!("Failed to write env.sh: {}", e))?;

    let perms = std::fs::Permissions::from_mode(0o755);
    std::fs::set_permissions(&env_sh_path, perms.clone())
        .map_err(|e| format!("Failed to set env.sh permissions: {}", e))?;

    // Write fish version
    let env_fish_path = instance_dir.join("env.fish");
    let fish_contents = format!(
        r#"# 0ma environment for instance {name}
set -gx KUBECONFIG "$HOME/.lima/{name}/kubeconfig.yaml"
set -gx DOCKER_HOST "unix://$HOME/.lima/{name}/docker.sock"

# Symlink kubeconfig to ~/.kube/ for tools like Lens
if not test -L "$HOME/.kube/{name}"
  mkdir -p "$HOME/.kube"
  ln -sf "$HOME/.lima/{name}/kubeconfig.yaml" "$HOME/.kube/{name}"
end
"#,
        name = instance_name
    );

    std::fs::write(&env_fish_path, &fish_contents)
        .map_err(|e| format!("Failed to write env.fish: {}", e))?;
    std::fs::set_permissions(&env_fish_path, perms)
        .map_err(|e| format!("Failed to set env.fish permissions: {}", e))?;

    // Return the path appropriate for the user's shell
    let shell = std::env::var("SHELL").unwrap_or_default();
    let result_path = if shell.contains("fish") {
        env_fish_path
    } else {
        env_sh_path
    };

    Ok(result_path.to_string_lossy().to_string())
}

/// Check whether env.sh already exists for the given instance.
pub fn check_env_sh_exists<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<bool, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join("env.sh").exists())
}

/// Append a `source` line for the instance's env file to the user's shell profile.
/// Supports bash (.bashrc), zsh (.zshrc), and fish (~/.config/fish/config.fish).
/// Returns a description of what happened.
pub fn append_to_shell_profile<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<String, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    let shell = std::env::var("SHELL").unwrap_or_default();
    let is_fish = shell.contains("fish");

    let env_file = if is_fish { "env.fish" } else { "env.sh" };
    let env_path = instance_dir.join(env_file);
    let env_path_str = env_path.to_string_lossy();

    let source_line = if is_fish {
        format!(
            r#"if test -f "{}"; source "{}"; end"#,
            env_path_str, env_path_str
        )
    } else {
        format!(r#"[ -f "{}" ] && source "{}""#, env_path_str, env_path_str)
    };

    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    let (profile_path, profile_display) = if is_fish {
        (
            home.join(".config/fish/config.fish"),
            "~/.config/fish/config.fish".to_string(),
        )
    } else if shell.contains("zsh") {
        (home.join(".zshrc"), "~/.zshrc".to_string())
    } else {
        (home.join(".bashrc"), "~/.bashrc".to_string())
    };

    if profile_path.exists() {
        let existing = std::fs::read_to_string(&profile_path)
            .map_err(|e| format!("Failed to read {}: {}", profile_display, e))?;
        if existing.contains(&source_line) {
            return Ok(format!(
                "Source line already present in {profile_display}"
            ));
        }
    }

    // Ensure parent directory exists (needed for fish: ~/.config/fish/)
    if let Some(parent) = profile_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory for {}: {}", profile_display, e))?;
    }

    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&profile_path)
        .map_err(|e| format!("Failed to open {}: {}", profile_display, e))?;

    writeln!(file, "\n# 0ma environment for instance {}", instance_name)
        .map_err(|e| format!("Failed to write to {}: {}", profile_display, e))?;
    writeln!(file, "{}", source_line)
        .map_err(|e| format!("Failed to write to {}: {}", profile_display, e))?;

    Ok(format!("Added source line to {profile_display}"))
}

/// Remove the env source lines for the given instance from the user's shell profile.
/// Also removes the `~/.kube/<instance>` symlink if it exists.
/// Silently succeeds if nothing needs cleaning up.
pub fn cleanup_env_on_delete<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<(), String> {
    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    // 1. Remove source lines from shell profiles
    let instance_dir = get_instance_dir(app, instance_name)?;

    let profiles = [
        home.join(".zshrc"),
        home.join(".bashrc"),
        home.join(".config/fish/config.fish"),
    ];

    let env_sh_str = instance_dir.join("env.sh").to_string_lossy().to_string();
    let env_fish_str = instance_dir.join("env.fish").to_string_lossy().to_string();
    let comment_marker = format!("# 0ma environment for instance {}", instance_name);

    for profile in &profiles {
        if !profile.exists() {
            continue;
        }

        let content = match std::fs::read_to_string(profile) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let filtered: Vec<&str> = content
            .lines()
            .filter(|line| {
                !line.contains(&env_sh_str)
                    && !line.contains(&env_fish_str)
                    && line.trim() != comment_marker
            })
            .collect();

        // Only write if something changed
        if filtered.len() < content.lines().count() {
            // Trim trailing blank lines left over, then add a final newline
            let new_content = filtered.join("\n").trim_end().to_string() + "\n";
            let _ = std::fs::write(profile, new_content);
        }
    }

    // 2. Remove ~/.kube/<instance> symlink
    let kube_symlink = home.join(".kube").join(instance_name);
    if kube_symlink.is_symlink() {
        let _ = std::fs::remove_file(&kube_symlink);
    }

    Ok(())
}

const COMMENT_PREFIX: &str = "# 0ma environment for instance ";

/// Extract an instance name from a source line like:
///   `[ -f "/Users/x/.lima/foo/env.sh" ] && source "/Users/x/.lima/foo/env.sh"`
///   `if test -f "/Users/x/.lima/foo/env.fish"; source "/Users/x/.lima/foo/env.fish"; end`
/// Returns the instance name ("foo") if the line matches the pattern.
fn extract_instance_from_source_line(line: &str, lima_home: &std::path::Path) -> Option<String> {
    let prefix = format!("{}/", lima_home.to_string_lossy());
    // Find the lima home path in the line
    let rest = line.find(&prefix).map(|i| &line[i + prefix.len()..])?;
    // Extract instance name (everything before the next '/')
    let name = rest.split('/').next()?;
    if name.is_empty() {
        return None;
    }
    Some(name.to_string())
}

/// Scan shell profiles and ~/.kube/ for orphaned 0ma entries whose Lima instance
/// directory no longer exists. Uses three detection strategies:
/// 1. Comment markers: `# 0ma environment for instance <name>`
/// 2. Source lines: any line referencing `<lima_home>/<name>/env.{sh,fish}`
/// 3. Dangling ~/.kube/ symlinks pointing into lima_home
pub fn detect_orphaned_env_entries<R: tauri::Runtime>(
    app: &AppHandle<R>,
) -> Result<Vec<String>, String> {
    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;

    let lima_home = crate::yaml_handler::get_lima_home(app)?;

    let profiles = [
        home.join(".zshrc"),
        home.join(".bashrc"),
        home.join(".config/fish/config.fish"),
    ];

    let mut orphaned: Vec<String> = Vec::new();

    let mut add_if_orphaned = |name: &str| {
        if name.is_empty() || orphaned.iter().any(|n| n == name) {
            return;
        }
        if !lima_home.join(name).exists() {
            orphaned.push(name.to_string());
        }
    };

    // Scan shell profiles for comment markers and source lines
    for profile in &profiles {
        let content = match std::fs::read_to_string(profile) {
            Ok(c) => c,
            Err(_) => continue,
        };

        for line in content.lines() {
            let trimmed = line.trim();

            // Strategy 1: comment marker
            if let Some(name) = trimmed.strip_prefix(COMMENT_PREFIX) {
                add_if_orphaned(name.trim());
                continue;
            }

            // Strategy 2: source line containing lima_home path
            if let Some(name) = extract_instance_from_source_line(trimmed, &lima_home) {
                add_if_orphaned(&name);
            }
        }
    }

    // Strategy 3: dangling ~/.kube/ symlinks pointing into lima_home
    let kube_dir = home.join(".kube");
    if kube_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&kube_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_symlink() {
                    continue;
                }
                // Check if symlink target is inside lima_home
                if let Ok(target) = std::fs::read_link(&path) {
                    if target.starts_with(&lima_home) {
                        // The symlink points into lima_home — check if the instance dir exists
                        if let Some(name) = entry.file_name().to_str() {
                            add_if_orphaned(name);
                        }
                    }
                }
            }
        }
    }

    Ok(orphaned)
}

/// Clean up orphaned env entries for the given instance names.
/// Calls `cleanup_env_on_delete` for each name.
pub fn cleanup_orphaned_env_entries<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_names: &[String],
) -> Result<(), String> {
    for name in instance_names {
        cleanup_env_on_delete(app, name)?;
    }
    Ok(())
}
