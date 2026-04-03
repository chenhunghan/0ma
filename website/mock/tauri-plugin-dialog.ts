interface MessageOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
}

interface AskOptions extends MessageOptions {
  okLabel?: string;
  cancelLabel?: string;
}

export async function message(msg: string, options?: string | MessageOptions) {
  const title = typeof options === "string" ? options : options?.title ?? "Message";
  console.info(`[mock] dialog: message("${title}") — ${msg}`);
}

export async function ask(msg: string, options?: string | AskOptions): Promise<boolean> {
  const title = typeof options === "string" ? options : options?.title ?? "Confirm";
  console.info(`[mock] dialog: ask("${title}") — ${msg}`);
  return false;
}
