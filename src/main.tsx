import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as monaco from "monaco-editor";

// Simple tree types
type Node = {
  type: "dir" | "file";
  name: string;
  path: string;
  children?: Node[];
};

function Tree({ nodes, onOpen }: { nodes: Node[]; onOpen: (n: Node) => void }) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.type === "dir" ? (
            <details open>
              <summary>📁 {n.name}</summary>
              <Tree nodes={n.children ?? []} onOpen={onOpen} />
            </details>
          ) : (
            <div className="file" onClick={() => onOpen(n)}>
              📄 {n.name}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function DiffEditor({
  original,
  modified,
  language,
}: {
  original: string;
  modified: string;
  language: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    editorRef.current = monaco.editor.createDiffEditor(ref.current, {
      automaticLayout: true,
      readOnly: false,
    });

    const o = monaco.editor.createModel(original, language);
    const m = monaco.editor.createModel(modified, language);
    editorRef.current.setModel({ original: o, modified: m });

    return () => {
      o.dispose();
      m.dispose();
      editorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    const models = editorRef.current.getModel();
    if (!models) return;
    models.original.setValue(original);
    models.modified.setValue(modified);
  }, [original, modified]);

  return <div style={{ width: "100%", height: "100%" }} ref={ref} />;
}

function App() {
  const [workspace, setWorkspace] = useState<{
    root: string;
    tree: Node[];
  } | null>(null);
  const [currentFile, setCurrentFile] = useState<Node | null>(null);
  const [original, setOriginal] = useState("");
  const [converted, setConverted] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [logs, setLogs] = useState<string>("");

  async function openWorkspace() {
    const res = await window.api.openWorkspace();
    if (res) setWorkspace(res);
  }

  async function openFile(n: Node) {
    if (n.type !== "file") return;
    const text = await window.api.readFile(n.path);
    setCurrentFile(n);
    setOriginal(text);
    setConverted("");
    setLanguage(guessLanguageFromName(n.name));
  }

  function guessLanguageFromName(name: string) {
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".cs")) return "csharp";
    return "plaintext";
  }

  async function runPipeline() {
    // Mock: Java -> TypeScript conversion demo
    append(`[Pipeline] Convert → Format → Validate`);
    const out = mockConvertJavaToTS(original);
    setConverted(out);
    append(`[Format] (Prettier step would run here)`);
    append(`[Validate] (tsc --noEmit would run here)`);
  }

  async function saveConverted() {
    if (!workspace || !currentFile) return;
    const rel = currentFile.path
      .replace(workspace.root, "")
      .replace(/^\\|\//, "");
    const outPath = `${workspace.root}/converted/${rel}`
      .replace(/\\/g, "/")
      .replace(/\.java$/, ".ts");
    await window.api.writeFile(outPath, converted);
    append(`[Write] ${outPath}`);
  }

  function append(line: string) {
    setLogs((prev) => prev + (prev ? "\n" : "") + line);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="toolbar">
          <button onClick={openWorkspace}>Open Workspace</button>
        </div>
        {workspace ? (
          <Tree nodes={workspace.tree} onOpen={openFile} />
        ) : (
          <div style={{ padding: 12 }}>Open a folder…</div>
        )}
      </aside>

      <main className="center">
        <div className="toolbar">
          <button onClick={runPipeline} disabled={!original}>
            Run Pipeline
          </button>
          <button onClick={saveConverted} disabled={!converted}>
            Save Converted
          </button>
          <span style={{ marginLeft: "auto", opacity: 0.7 }}>
            Lang: {language}
          </span>
        </div>
        <DiffEditor
          original={original}
          modified={converted || "// Converted output will appear here"}
          language={language}
        />
      </main>

      <section className="right">
        <div className="panel-tabs">Issues | Explain | Tasks</div>
        <div
          style={{
            padding: 8,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <div style={{ opacity: 0.7, marginBottom: 8 }}>
            Mock conversion notes will appear here.
          </div>
          <ul>
            <li>Visibility → public default</li>
            <li>System.out.println → console.log</li>
            <li>static main → function main()</li>
          </ul>
        </div>
      </section>

      <div className="console">
        <pre>{logs}</pre>
      </div>
    </div>
  );
}

// --- Mock converter (replace with real parser/AI later) ---
function mockConvertJavaToTS(src: string): string {
  let out = src;
  out = out.replace(/System\.out\.println/g, "console.log");
  out = out.replace(/public\s+class\s+(\w+)\s*\{/g, "class $1 {");
  out = out.replace(
    /public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g,
    "static main(): void {"
  );
  out = out.replace(/String/g, "string");
  if (!/\bmain\s*\(/.test(out)) {
    out += "\n\n// NOTE: No main() detected.";
  } else if (!/\b\w+\.main\(\)/.test(out)) {
    const m = /class\s+(\w+)/.exec(out);
    if (m) out += `\n\n${m[1]}.main();`;
  }
  return out;
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
