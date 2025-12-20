use crate::lima_config::{LimaConfig, ContainerdConfig, Provision, Probe, CopyToHost};

/// Create a sample k0s configuration using the structured approach
pub fn create_sample_k0s_config() -> LimaConfig {
    let mut config = LimaConfig::new();

    // Set k0s-specific values
    config.minimum_lima_version = Some("1.1.0".to_string());
    config.base = "template://_images/ubuntu-lts".to_string();

    // k0s manages its own containerd
    config.containerd = Some(ContainerdConfig {
        system: false,
        user: false,
    });

    // Add k0s provisioning scripts
    config.provision = Some(vec![
        Provision {
            mode: "system".to_string(),
            script: r#"#!/bin/bash
set -eux -o pipefail
command -v k0s >/dev/null 2>&1 && exit 0

# install k0s prerequisites
curl -sfL https://get.k0s.sh | sh"#.to_string(),
        },
        Provision {
            mode: "system".to_string(),
            script: r#"#!/bin/bash
set -eux -o pipefail

#  start k0s as a single node cluster
if ! systemctl status k0scontroller >/dev/null 2>&1; then
  k0s install controller --single
fi

systemctl start k0scontroller"#.to_string(),
        },
    ]);

    // Add k0s-specific probes
    config.probes = Some(vec![
        Probe {
            description: "k0s to be running".to_string(),
            script: r#"#!/bin/bash
set -eux -o pipefail
if ! timeout 30s bash -c "until sudo test -f /var/lib/k0s/pki/admin.conf; do sleep 3; done"; then
  echo >&2 "k0s kubeconfig file has not yet been created"
  exit 1
fi"#.to_string(),
            hint: Some(
                "The k0s control plane is not ready yet.\nRun \"limactl shell k0s sudo journalctl -u k0scontroller\" to debug.".to_string()
            ),
        },
    ]);

    // Copy kubeconfig to host
    config.copy_to_host = Some(vec![
        CopyToHost {
            guest: "/var/lib/k0s/pki/admin.conf".to_string(),
            host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml".to_string(),
            delete_on_stop: Some(true),
        },
    ]);

    // Add usage message
    config.message = Some(r#"To run `kubectl` on the host (assumes kubectl is installed), run the following commands:
------
export KUBECONFIG="{{.Dir}}/copied-from-guest/kubeconfig.yaml"
kubectl ...
------"#.to_string());

    config
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_deserialize_k0s_config() {
        let original = create_sample_k0s_config();

        // Serialize to YAML
        let yaml = original.to_yaml_pretty().unwrap();
        println!("Serialized YAML:\n{}", yaml);

        // Deserialize back
        let deserialized = LimaConfig::from_yaml(&yaml).unwrap();

        // Verify key fields
        assert_eq!(original.minimum_lima_version, deserialized.minimum_lima_version);
        assert_eq!(original.base, deserialized.base);
        assert_eq!(original.containerd.as_ref().unwrap().system, deserialized.containerd.as_ref().unwrap().system);
        assert_eq!(original.containerd.as_ref().unwrap().user, deserialized.containerd.as_ref().unwrap().user);
        assert_eq!(original.provision.as_ref().unwrap().len(), deserialized.provision.as_ref().unwrap().len());
        assert_eq!(original.probes.as_ref().unwrap().len(), deserialized.probes.as_ref().unwrap().len());
        assert_eq!(original.copy_to_host.as_ref().unwrap().len(), deserialized.copy_to_host.as_ref().unwrap().len());
    }

    #[test]
    fn test_template_variable_substitution() {
        let mut config = LimaConfig::new();
        config.copy_to_host = Some(vec![CopyToHost {
            guest: "/test/path".to_string(),
            host: "{{.Dir}}/test.yaml".to_string(),
            delete_on_stop: None,
        }]);
        config.message = Some("Config in {{.Dir}} for {{.User}}".to_string());

        let vars = crate::lima_config::TemplateVars {
            dir: "/path/to/instance".to_string(),
            home: "/home/user".to_string(),
            user: "testuser".to_string(),
        };

        config.substitute_variables(&vars);

        assert_eq!(config.copy_to_host.as_ref().unwrap()[0].host, "/path/to/instance/test.yaml");
        assert_eq!(config.message.unwrap(), "Config in /path/to/instance for testuser");
    }
}