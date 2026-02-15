import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useState } from "react";
import { parse, stringify } from "yaml";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { isEqual } from "lodash";
import { Spinner } from "./ui/spinner";

const EDITOR_OPTIONS = {
  automaticLayout: true,
  contextmenu: false,
  folding: true,
  fontSize: 12,
  glyphMargin: false,
  lineDecorationsWidth: 5,
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  padding: { bottom: 16, top: 16 },
  scrollBeyondLastLine: false,
  scrollbar: {
    horizontalScrollbarSize: 6,
    verticalScrollbarSize: 6,
  },
} as const;

export function LimaConfigEditor() {
  const { draftConfig, updateDraftConfig, isLoading } = useUpdateLimaInstanceDraft();

  const [yamlValue, setYamlValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initial load and sync back if draftConfig changes externally
  useEffect(() => {
    if (draftConfig) {
      const currentYaml = stringify(draftConfig);
      try {
        const localParsed = parse(yamlValue);
        if (!isEqual(localParsed, draftConfig)) {
          setYamlValue(currentYaml);
        }
      } catch {
        setYamlValue(currentYaml);
        setError(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftConfig]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newVal = value || "";
      setYamlValue(newVal);

      try {
        const parsed = parse(newVal);
        // Only update if it's actually different to avoid unnecessary store writes
        if (!isEqual(parsed, draftConfig)) {
          updateDraftConfig(parsed);
        }
        setError(null);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(String(error));
        }
      }
    },
    [draftConfig, updateDraftConfig],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div title="Loading config draft...">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {error ? (
            <div className="flex items-center gap-1 text-[10px] text-destructive animate-in fade-in slide-in-from-left-1">
              <AlertCircle className="w-3 h-3" />
              <span>Invalid YAML</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-green-500 animate-in fade-in slide-in-from-left-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Valid</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language="yaml"
          theme="vs-dark"
          value={yamlValue}
          onChange={handleEditorChange}
          options={EDITOR_OPTIONS}
        />
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-[10px] font-mono text-destructive break-all max-h-32 overflow-y-auto z-10">
          <div className="font-bold mb-1 uppercase text-[9px]">Syntax Error:</div>
          {error}
        </div>
      )}
    </div>
  );
}
