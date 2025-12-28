use crate::find_lima_executable;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodList {
    pub items: Vec<Pod>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pod {
    pub metadata: Metadata,
    pub spec: Option<PodSpec>,
    pub status: Option<PodStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub name: String,
    pub namespace: String,
    pub uid: Option<String>,
    #[serde(default)]
    pub labels: std::collections::HashMap<String, String>,
    #[serde(rename = "creationTimestamp")]
    pub creation_timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodSpec {
    #[serde(rename = "nodeName")]
    pub node_name: Option<String>,
    #[serde(default)]
    pub containers: Vec<Container>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Container {
    pub name: String,
    #[serde(default)]
    pub env: Vec<EnvVar>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub name: String,
    pub value: Option<String>,
    #[serde(rename = "valueFrom")]
    pub value_from: Option<EnvVarSource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVarSource {
    #[serde(rename = "configMapKeyRef")]
    pub config_map_key_ref: Option<ConfigMapKeySelector>,
    #[serde(rename = "secretKeyRef")]
    pub secret_key_ref: Option<SecretKeySelector>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigMapKeySelector {
    pub name: Option<String>,
    pub key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretKeySelector {
    pub name: Option<String>,
    pub key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodStatus {
    pub phase: Option<String>,
    #[serde(rename = "hostIP")]
    pub host_ip: Option<String>,
    #[serde(rename = "podIP")]
    pub pod_ip: Option<String>,
    #[serde(rename = "startTime")]
    pub start_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceList {
    pub items: Vec<Service>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub metadata: Metadata,
    pub spec: Option<ServiceSpec>,
    pub status: Option<ServiceStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceSpec {
    pub ports: Option<Vec<ServicePort>>,
    pub selector: Option<std::collections::HashMap<String, String>>,
    #[serde(rename = "clusterIP")]
    pub cluster_ip: Option<String>,
    #[serde(rename = "externalIPs")]
    pub external_ips: Option<Vec<String>>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicePort {
    pub name: Option<String>,
    pub port: i32,
    pub protocol: Option<String>,
    #[serde(rename = "targetPort")]
    pub target_port: Option<serde_json::Value>,
    #[serde(rename = "nodePort")]
    pub node_port: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    #[serde(rename = "loadBalancer")]
    pub load_balancer: Option<LoadBalancerStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerStatus {
    pub ingress: Option<Vec<LoadBalancerIngress>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerIngress {
    pub ip: Option<String>,
    pub hostname: Option<String>,
}

pub fn get_k8s_pods(instance_name: &str) -> Result<Vec<Pod>, String> {
    let lima_cmd = find_lima_executable().ok_or_else(|| "Lima (limactl) not found".to_string())?;

    // Dynamic detection of k0s vs standard kubectl
    // We use a shell script inside the Lima instance to determine which command to run
    let script = r#"
if command -v k0s >/dev/null 2>&1; then
    k0s kubectl get pods -A -o json
else
    kubectl get pods -A -o json
fi
"#;

    let output = Command::new(&lima_cmd)
        .args(["shell", instance_name, "sh", "-c", script])
        .output()
        .map_err(|e| format!("Failed to execute limactl shell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse JSON output
    let pod_list: PodList = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse kubectl JSON output: {}", e))?;

    Ok(pod_list.items)
}

pub fn get_k8s_services(instance_name: &str) -> Result<Vec<Service>, String> {
    let lima_cmd = find_lima_executable().ok_or_else(|| "Lima (limactl) not found".to_string())?;

    let script = r#"
if command -v k0s >/dev/null 2>&1; then
    k0s kubectl get services -A -o json
else
    kubectl get services -A -o json
fi
"#;

    let output = Command::new(&lima_cmd)
        .args(["shell", instance_name, "sh", "-c", script])
        .output()
        .map_err(|e| format!("Failed to execute limactl shell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    let service_list: ServiceList = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse kubectl JSON output: {}", e))?;

    Ok(service_list.items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pod_list_json() {
        let json = r#"
{
    "apiVersion": "v1",
    "kind": "List",
    "items": [
        {
            "metadata": {
                "name": "coredns-7c65d6cfc9-qj9qj",
                "namespace": "kube-system",
                "uid": "12345",
                "creationTimestamp": "2023-01-01T00:00:00Z",
                "labels": {
                    "k8s-app": "kube-dns"
                }
            },
            "spec": {
                "nodeName": "lima-k8s",
                "containers": [
                    {
                        "name": "coredns",
                        "env": [
                            {
                                "name": "ENV_VAR_1",
                                "value": "value1"
                            }
                        ]
                    }
                ]
            },
            "status": {
                "phase": "Running",
                "hostIP": "192.168.5.15",
                "podIP": "10.244.0.3",
                "startTime": "2023-01-01T00:00:05Z"
            }
        }
    ]
}
"#;
        let pod_list: PodList = serde_json::from_str(json).expect("Failed to parse JSON");
        assert_eq!(pod_list.items.len(), 1);
        let pod = &pod_list.items[0];
        assert_eq!(pod.metadata.name, "coredns-7c65d6cfc9-qj9qj");
        assert_eq!(pod.metadata.namespace, "kube-system");
        assert_eq!(
            pod.status.as_ref().unwrap().phase,
            Some("Running".to_string())
        );

        // Verify env vars
        assert!(pod.spec.is_some());
        let spec = pod.spec.as_ref().unwrap();
        assert_eq!(spec.containers.len(), 1);
        let container = &spec.containers[0];
        assert_eq!(container.name, "coredns");
        assert_eq!(container.env.len(), 1);
        assert_eq!(container.env[0].name, "ENV_VAR_1");
        assert_eq!(container.env[0].value, Some("value1".to_string()));
    }
}
