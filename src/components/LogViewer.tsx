import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LogState } from "src/types/Log";
import type { HighlighterCore } from "shiki/core";
import { getHighlighter } from "src/lib/shiki";

const CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: '"FiraCode Nerd Font", monospace',
  fontSize: 12,
  lineHeight: 1.15,
};

interface Props {
  logState: LogState;
}

function createMarkup(html: string) {
  return { __html: html };
}

export const LogViewer: React.FC<Props> = ({ logState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  useEffect(() => {
    getHighlighter().then(setHighlighter);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el && autoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logState.stdout, logState.stderr]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  }, []);

  const allEntries = useMemo(() => {
    return [
      ...logState.stdout.map((e) => ({ ...e, stream: "stdout" as const })),
      ...logState.stderr.map((e) => ({ ...e, stream: "stderr" as const })),
    ];
  }, [logState.stdout, logState.stderr]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-64 w-full overflow-y-auto overflow-x-hidden rounded bg-transparent text-zinc-300 p-2 select-text"
      style={CONTAINER_STYLE}
    >
      {allEntries.map((entry) => {
        if (!highlighter) {
          return (
            <div key={entry.id} className="whitespace-pre-wrap break-all">
              {entry.message}
            </div>
          );
        }
        const html = highlighter.codeToHtml(entry.message, {
          lang: "log",
          theme: "github-dark",
        });
        return (
          <div
            key={entry.id}
            className="[&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&_code]:!bg-transparent [&>pre]:!whitespace-pre-wrap [&_code]:!whitespace-pre-wrap [&>pre]:break-all [&_code]:break-all"
            dangerouslySetInnerHTML={createMarkup(html)}
          />
        );
      })}
    </div>
  );
};
