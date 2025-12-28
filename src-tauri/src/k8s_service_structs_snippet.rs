use serde::{Deserialize, Serialize};

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

// Metadata is already defined in k8s_service.rs, reuse it.

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
    pub target_port: Option<serde_json::Value>, // targetPort can be int or string
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
