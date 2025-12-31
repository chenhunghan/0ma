import { useLimaDraft } from "src/hooks/useLimaDraft";
import Editor from '@monaco-editor/react';
import { useState, useEffect } from "react";
import { stringify, parse } from "yaml";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { isEqual } from "lodash";
import { Spinner } from "./ui/spinner";

export function LimaConfigEditor({ instanceName }: { instanceName: string }) {
    const {
        draftConfig,
        updateDraftConfig,
        isLoading
    } = useLimaDraft(instanceName);

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
            } catch (e) {
                // If local YAML is invalid, and draftConfig exists, we might want to sync 
                // but wait if user is typing. For now, just sync if yamlValue is empty.
                if (!yamlValue) {
                    setYamlValue(currentYaml);
                }
            }
        }
    }, [draftConfig]);

    const handleEditorChange = (value: string | undefined) => {
        const newVal = value || "";
        setYamlValue(newVal);

        try {
            const parsed = parse(newVal);
            // Only update if it's actually different to avoid unnecessary store writes
            if (!isEqual(parsed, draftConfig)) {
                updateDraftConfig(parsed);
            }
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-full w-full">
            <div title="Loading config draft...">
                <Spinner />
            </div>
        </div>
    );

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
                    options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 5,
                        lineNumbersMinChars: 3,
                        contextmenu: false,
                    }}
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