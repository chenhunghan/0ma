export function trace(message: string) {
  console.debug("[TRACE]", message);
}

export function debug(message: string) {
  console.debug("[DEBUG]", message);
}

export function info(message: string) {
  console.info("[INFO]", message);
}

export function warn(message: string) {
  console.warn("[WARN]", message);
}

export function error(message: string) {
  console.error("[ERROR]", message);
}

export function attachConsole() {
  return Promise.resolve(() => {});
}

export function attachLogger() {
  return Promise.resolve(() => {});
}
