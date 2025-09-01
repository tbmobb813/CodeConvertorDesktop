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
  // Folder operations
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleCreate = async (parent: Node, isDir: boolean) => {
    if (busyPath) return;
    setBusyPath(parent.path + (isDir ? '/newfolder' : '/newfile'));
    setError(null);
    try {
      const name = prompt(`Enter ${isDir ? "folder" : "file"} name:`);
      if (!name) { setBusyPath(null); return; }
      const newPath = parent.path + "/" + name;
      await window.api.createFileOrDir(newPath, isDir);
      window.location.reload();
    } catch (e) {
      setError("Create failed: " + (e?.message || e));
      setBusyPath(null);
    }
  };
  const handleRename = async (n: Node) => {
    if (busyPath) return;
    setBusyPath(n.path + '/rename');
    setError(null);
    try {
      const name = prompt("Enter new name:", n.name);
      if (!name || name === n.name) { setBusyPath(null); return; }
      const newPath = n.path.substring(0, n.path.lastIndexOf("/") + 1) + name;
      await window.api.renameFileOrDir(n.path, newPath);
      window.location.reload();
    } catch (e) {
      setError("Rename failed: " + (e?.message || e));
      setBusyPath(null);
    }
  };
  const handleDelete = async (n: Node) => {
    if (busyPath) return;
    setBusyPath(n.path + '/delete');
    setError(null);
    try {
      if (!confirm(`Delete ${n.type === "dir" ? "folder" : "file"} '${n.name}'?`)) { setBusyPath(null); return; }
      await window.api.deleteFileOrDir(n.path);
      window.location.reload();
    } catch (e) {
      setError("Delete failed: " + (e?.message || e));
      setBusyPath(null);
    }
  };
  return (
    <>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <ul>
        {nodes.map((n) => (
          <li key={n.path}>
            {n.type === "dir" ? (
              <details open>
                <summary>
                  📁 {n.name}
                  <button
                    title="New File"
                    style={{ marginLeft: 4, opacity: busyPath ? 0.5 : 1 }}
                    disabled={!!busyPath}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreate(n, false);
                    }}
                  >{busyPath === n.path + '/newfile' ? '...' : '+'}</button>
                  <button
                    title="New Folder"
                    style={{ marginLeft: 2, opacity: busyPath ? 0.5 : 1 }}
                    disabled={!!busyPath}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreate(n, true);
                    }}
                  >{busyPath === n.path + '/newfolder' ? '...' : '📁+'}</button>
                  <button
                    title="Rename"
                    style={{ marginLeft: 2, opacity: busyPath ? 0.5 : 1 }}
                    disabled={!!busyPath}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(n);
                    }}
                  >{busyPath === n.path + '/rename' ? '...' : '✎'}</button>
                  <button
                    title="Delete"
                    style={{ marginLeft: 2, opacity: busyPath ? 0.5 : 1 }}
                    disabled={!!busyPath}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n);
                    }}
                  >{busyPath === n.path + '/delete' ? '...' : '🗑️'}</button>
                </summary>
                <Tree nodes={n.children ?? []} onOpen={onOpen} />
              </details>
            ) : (
              <div
                className="file"
                style={{ display: "inline-block" }}
              >
                <span onClick={() => onOpen(n)}>📄 {n.name}</span>
                <button
                  title="Rename"
                  style={{ marginLeft: 4, opacity: busyPath ? 0.5 : 1 }}
                  disabled={!!busyPath}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(n);
                  }}
                >{busyPath === n.path + '/rename' ? '...' : '✎'}</button>
                <button
                  title="Delete"
                  style={{ marginLeft: 2, opacity: busyPath ? 0.5 : 1 }}
                  disabled={!!busyPath}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(n);
                  }}
                >{busyPath === n.path + '/delete' ? '...' : '🗑️'}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
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
  const [workspace, setWorkspace] = useState<{ root: string; tree: any[] } | null>(null);
  const [currentFile, setCurrentFile] = useState<Node | null>(null);
  const [original, setOriginal] = useState("");
  const [converted, setConverted] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [logs, setLogs] = useState<string>("");
  const [status, setStatus] = useState("Ready");
  const [history, setHistory] = useState<Array<{ root: string; tree: any[] }>>([]);
  const [future, setFuture] = useState<Array<{ root: string; tree: any[] }>>([]);
  // Batch conversion state
  const [batchResults, setBatchResults] = useState<any[] | null>(null);
  const [dryRunResults, setDryRunResults] = useState<any[] | null>(null);
  // For demo: select all .java files in workspace
  function getAllJavaFiles(tree: any[]): string[] {
    let files: string[] = [];
    for (const n of tree) {
      if (n.type === "file" && n.name.endsWith(".java")) files.push(n.path);
      if (n.type === "dir" && n.children) files = files.concat(getAllJavaFiles(n.children));
    }
    return files;
  }
  async function runBatchConvert() {
    if (!workspace) return;
    setStatus("Batch converting...");
    const filePaths = getAllJavaFiles(workspace.tree);
    const res = await window.api.batchConvert(filePaths);
    setBatchResults(res.results);
    setStatus("Batch conversion done");
    append(`[Batch] Converted ${filePaths.length} files.`);
  }
  async function runDryRunConvert() {
    if (!workspace) return;
    setStatus("Dry run...");
    const filePaths = getAllJavaFiles(workspace.tree);
    const res = await window.api.dryRunConvert(filePaths);
    setDryRunResults(res.previews);
    setStatus("Dry run complete");
    append(`[Dry Run] Previewed ${filePaths.length} files.`);
  }

  async function openWorkspace() {
    setStatus("Opening workspace...");
    if (window.api && window.api.openWorkspace) {
      const ws = await window.api.openWorkspace();
      if (ws) {
        setHistory([]);
        setFuture([]);
        setWorkspace(ws);
        setStatus("Ready");
      } else {
        setStatus("No folder selected");
      }
    }
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

  function undo() {
    if (!workspace || history.length === 0) return;
    setFuture((prev) => [workspace, ...prev]);
    setWorkspace(history[history.length - 1]);
    setHistory((prev) => prev.slice(0, -1));
  }

  function redo() {
    if (!workspace || future.length === 0) return;
    setHistory((prev) => [...prev, workspace]);
    setWorkspace(future[0]);
    setFuture((prev) => prev.slice(1));
  }

  return (
  <div className="app">
      <aside className="sidebar">
        <div className="toolbar">
                  <button onClick={openWorkspace}>Open Workspace</button>
                  <button onClick={undo} disabled={history.length === 0}>Undo</button>
                  <button onClick={redo} disabled={future.length === 0}>Redo</button>
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
          <button onClick={runBatchConvert} disabled={!workspace} style={{ marginLeft: 8 }}>
            Batch Convert (.java)
          </button>
          <button onClick={runDryRunConvert} disabled={!workspace} style={{ marginLeft: 4 }}>
            Dry Run (.java)
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
        {/* Batch results display */}
        {batchResults && (
          <div style={{ marginTop: 16 }}>
            <h3>Batch Conversion Results</h3>
            <ul>
              {batchResults.map((r, i) => (
                <li key={r.filePath || i} style={{ marginBottom: 8 }}>
                  <b>{r.filePath}</b><br />
                  {r.error ? (
                    <span style={{ color: 'crimson' }}>Error: {r.error}</span>
                  ) : (
                    <span>
                      <span style={{ color: 'green' }}>Converted</span>
                      <pre style={{ background: '#f6f6f6', padding: 8 }}>{r.converted}</pre>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Dry run results display */}
        {dryRunResults && (
          <div style={{ marginTop: 16 }}>
            <h3>Dry Run Previews</h3>
            <ul>
              {dryRunResults.map((r, i) => (
                <li key={r.filePath || i} style={{ marginBottom: 8 }}>
                  <b>{r.filePath}</b><br />
                  {r.error ? (
                    <span style={{ color: 'crimson' }}>Error: {r.error}</span>
                  ) : (
                    <span>
                      <span style={{ color: 'blue' }}>Diff Preview</span>
                      <pre style={{ background: '#f0f8ff', padding: 8 }}>{r.diff || '[No changes]'}</pre>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
