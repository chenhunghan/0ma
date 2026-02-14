import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

let highlighterPromise: Promise<HighlighterCore> | null = null;

/**
 * Lazily creates and returns a shared Shiki highlighter instance.
 * Loads only the languages and themes we need.
 */
export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("shiki/themes/github-dark.mjs")],
      langs: [import("shiki/langs/log.mjs")],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
  }
  return highlighterPromise;
}
