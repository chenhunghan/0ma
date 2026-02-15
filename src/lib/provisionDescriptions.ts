/**
 * Maps known provision scripts to human-readable descriptions.
 * Matches are checked in order; first match wins.
 */
const KNOWN_SCRIPTS: { pattern: RegExp; description: string }[] = [
  { pattern: /get\.k0s\.sh/, description: "Install k0s" },
  { pattern: /k0s install controller/, description: "Start k0s single-node cluster" },
  { pattern: /\/var\/lib\/k0s\/pki\/admin\.conf/, description: "Setup k0s kubeconfig" },
  { pattern: /k0s kubeconfig admin/, description: "Generate host kubeconfig" },
  { pattern: /get\.docker\.com/, description: "Install Docker" },
  { pattern: /get-helm/, description: "Install Helm" },
  { pattern: /local-path-provisioner/, description: "Install Local Path Provisioner" },
  { pattern: /install -y btop|install.*btop/, description: "Install btop" },
];

/**
 * Returns a description for a provision script if it matches a known pattern.
 * Falls back to the first comment line (after shebang), or null.
 */
export function getProvisionDescription(script: string): string | null {
  for (const { pattern, description } of KNOWN_SCRIPTS) {
    if (pattern.test(script)) {
      return description;
    }
  }

  // Fallback: extract first comment line that isn't a shebang
  const lines = script.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#!")) continue;
    if (trimmed.startsWith("# ")) return trimmed.slice(2).trim();
    if (trimmed.startsWith("#") && trimmed.length > 1) return trimmed.slice(1).trim();
    if (trimmed && !trimmed.startsWith("#")) break;
  }

  return null;
}
