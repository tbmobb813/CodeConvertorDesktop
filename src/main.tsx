import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { createRoot } from 'react-dom/client';

// ===== Types =====
export type FsNode = {
  type: 'dir' | 'file';
  name: string;
  path: string;
  children?: FsNode[];
};

export type Workspace = {
  root: string;
  tree: FsNode[];
};

// ===== Utilities =====
function guessLanguageFromName(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.java')) return 'java';
  if (n.endsWith('.ts') || n.endsWith('.tsx')) return 'typescript';
  if (n.endsWith('.js') || n.endsWith('.mjs') || n.endsWith('.cjs')) return 'javascript';
  if (n.endsWith('.cs')) return 'csharp';
  if (n.endsWith('.py')) return 'python';
  if (n.endsWith('.go')) return 'go';
  if (n.endsWith('.rb')) return 'ruby';
  if (n.endsWith('.rs')) return 'rust';
  if (n.endsWith('.cpp') || n.endsWith('.cc') || n.endsWith('.cxx')) return 'cpp';
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.yaml') || n.endsWith('.yml')) return 'yaml';
  return 'plaintext';
}

function flattenJavaFiles(nodes: FsNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === 'dir' && n.children) flattenJavaFiles(n.children, acc);
    else if (n.type === 'file' && n.path.toLowerCase().endsWith('.java')) acc.push(n.path);
  }
  return acc;
}

// ===== Monaco Diff Editor wrapper =====
function DiffEditor({ original, modified, language }: { original: string; modified: string; language: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const modelsRef = useRef<{ original: monaco.editor.ITextModel; modified: monaco.editor.ITextModel } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    editorRef.current = monaco.editor.createDiffEditor(ref.current, {
      automaticLayout: true,
      readOnly: false,
      renderSideBySide: true,
      originalEditable: false
    });

    const o = monaco.editor.createModel(original || '', language);
    const m = monaco.editor.createModel(modified || '', language);
    editorRef.current.setModel({ original: o, modified: m });
    modelsRef.current = { original: o, modified: m };

    return () => {
      modelsRef.current?.original.dispose();
      modelsRef.current?.modified.dispose();
      editorRef.current?.dispose();
      modelsRef.current = null;
      editorRef.current = null;
    };
  }, []);

  // Update text when props change
  useEffect(() => {
    if (!modelsRef.current) return;
    modelsRef.current.original.setValue(original || '');
    modelsRef.current.modified.setValue(modified || '');
  }, [original, modified]);

  // Update language tokenization when language changes
  useEffect(() => {
    if (!modelsRef.current) return;
    monaco.editor.setModelLanguage(modelsRef.current.original, language);
    monaco.editor.setModelLanguage(modelsRef.current.modified, language);
  }, [language]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

// ===== Mock converter (replace with real parser/AI) =====
function mockConvertJavaToTS(src: string): string {
  // Naive demo replacements—replace with real pipeline later
  let out = src;
  out = out.replace(/System\.out\.println/g, 'console.log');
  out = out.replace(/public\s+class\s+(\w+)\s*\{/g, 'class $1 {');
  out = out.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, 'static main(): void {');
  out = out.replace(/String/g, 'string');
  // auto-call main when class present
  const m = /class\s+(\w+)/.exec(out);
  if (m && /static\s+main\s*\(/.test(out) && !new RegExp(`${m[1]}\\.main\\(\\)`).test(out)) out += `\n\n${m[1]}.main();`;
  return out;
}

// ===== App =====
function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentFile, setCurrentFile] = useState<FsNode | null>(null);
  const [original, setOriginal] = useState<string>('');
  const [converted, setConverted] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [logs, setLogs] = useState<string>('');
  const [dryRunResults, setDryRunResults] = useState<Array<{ filePath: string; diff?: string; error?: string }>>([]);
  const [batchResults, setBatchResults] = useState<Array<{ filePath: string; converted?: string; error?: string }>>([]);

  // ---- Logging ----
  const log = (line: string) => setLogs((p) => (p ? p + '\n' : '') + line);

  // ---- Workspace ----
  const openWorkspace = async () => {
    const res = await window.api.openWorkspace({ returnLastIfNone: false });
    if (res) {
      setWorkspace(res);
      setCurrentFile(null);
      setOriginal('');
      setConverted('');
      setLogs('');
      setDryRunResults([]);
      setBatchResults([]);
    }
  };

  const refreshWorkspace = async () => {
    const res = await window.api.openWorkspace({ returnLastIfNone: true });
    if (res) setWorkspace(res);
  };

  // ---- File open ----
  const openFile = async (n: FsNode) => {
    if (n.type !== 'file') return;
    const text = await window.api.readFile(n.path);
    setCurrentFile(n);
    setOriginal(text);
    setConverted('');
    setLanguage(guessLanguageFromName(n.name));
    setDryRunResults([]);
    setBatchResults([]);
    log(`[Open] ${n.path}`);
  };

  // ---- Single-file pipeline ----
  const runPipeline = async () => {
    if (!original) return;
    log('[Pipeline] Convert → Format → Validate');
    // Convert
    const out = language === 'java' ? mockConvertJavaToTS(original) : original;
    setConverted(out);
    // Format (placeholder)
    log('[Format] Prettier step would run here');
    // Validate (placeholder)
    log('[Validate] tsc --noEmit step would run here');
  };

  const saveConverted = async () => {
    if (!workspace || !currentFile) return;
    const rel = currentFile.path.replace(workspace.root, '').replace(/^\\|\//, '');
    const outPath = `${workspace.root}/converted/${rel}`.replace(/\\/g, '/').replace(/\.java$/i, '.ts');
    await window.api.writeFile(outPath, converted || '');
    log(`[Write] ${outPath}`);
    await refreshWorkspace();
  };

  // ---- Dry run and batch convert ----
  const runDryRunConvert = async () => {
    if (!workspace) return;
    log('[Dry Run] Scanning .java files…');
    const files = flattenJavaFiles(workspace.tree);
    const previews: Array<{ filePath: string; diff?: string; error?: string }> = [];
    for (const filePath of files) {
      try {
        const src = await window.api.readFile(filePath);
        const dst = mockConvertJavaToTS(src);
        const diff = src === dst ? '' : dst.split('\n').slice(0, 20).join('\n') + '\n…';
        previews.push({ filePath, diff });
      } catch (e: any) {
        previews.push({ filePath, error: e?.message || String(e) });
      }
    }
    setDryRunResults(previews);
    log(`[Dry Run] Ready. ${previews.length} candidate file(s).`);
  };

  const runBatchConvert = async () => {
    if (!workspace) return;
    log('[Batch] Converting .java files → /converted mirror…');
    const files = flattenJavaFiles(workspace.tree);
    const results: Array<{ filePath: string; converted?: string; error?: string }> = [];
    for (const filePath of files) {
      try {
        const src = await window.api.readFile(filePath);
        const dst = mockConvertJavaToTS(src);
        const rel = filePath.replace(workspace.root, '').replace(/^\\|\//, '');
        const outPath = `${workspace.root}/converted/${rel}`.replace(/\\/g, '/').replace(/\.java$/i, '.ts');
        await window.api.writeFile(outPath, dst);
        results.push({ filePath, converted: outPath });
      } catch (e: any) {
        results.push({ filePath, error: e?.message || String(e) });
      }
    }
    setBatchResults(results);
    log(`[Batch] Done. ${results.length} file(s) processed.`);
    await refreshWorkspace();
  };

  // ===== UI Components =====
    const Tree: React.FC<{ nodes: FsNode[]; onOpen: (n: FsNode) => void }> = ({ nodes, onOpen }) => {
      // Handler functions go here
      const handleCreate = async (parent: FsNode, isDir: boolean) => {
  const name = prompt(`Enter ${isDir ? "folder" : "file"} name:`);
  if (!name) return;
  const newPath = parent.path + "/" + name;
  await window.api.createFileOrDir(newPath, isDir);
  await refreshWorkspace();
};
      const handleRename = async (node: FsNode) => {
  const name = prompt("Enter new name:", node.name);
  if (!name || name === node.name) return;
  const newPath = node.path.substring(0, node.path.lastIndexOf("/") + 1) + name;
  await window.api.renameFileOrDir(node.path, newPath);
  await refreshWorkspace();
};
        const handleDelete = async (node: FsNode) => {
  if (!confirm(`Delete ${node.type === "dir" ? "folder" : "file"} '${node.name}'?`)) return;
  await window.api.deleteFileOrDir(node.path);
  await refreshWorkspace();
};
        
    return (
      <ul style={{ listStyle: 'none', paddingLeft: 14 }}>
        {nodes.map((n) => (
          <li key={n.path}>
            {n.type === 'dir' ? (
              <details open>
                <summary>📁 {n.name}</summary>
                <Tree nodes={n.children ?? []} onOpen={onOpen} />
              </details>
            ) : (
              <div style={{ cursor: 'pointer' }} onClick={() => onOpen(n)}>
                📄 {n.name}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // ===== Render =====
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 420px',
        gridTemplateRows: '1fr 180px',
        height: '100vh',
        width: '100vw'
      }}
    >
      {/* Sidebar */}
      <aside style={{ borderRight: '1px solid #e5e5e5', overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: '1px solid #e5e5e5' }}>
          <button onClick={openWorkspace}>Open Workspace</button>
          <button onClick={refreshWorkspace} disabled={!workspace} title="Refresh tree">Refresh</button>
        </div>
        {workspace ? (
          <Tree nodes={workspace.tree} onOpen={openFile} />
        ) : (
          <div style={{ padding: 12 }}>Open a folder…</div>
        )}
      </aside>

      {/* Center: Editor */}
      <main style={{ display: 'grid', gridTemplateRows: '48px 1fr' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: '1px solid #e5e5e5' }}>
          <button onClick={runPipeline} disabled={!original}>Run Pipeline</button>
          <button onClick={runDryRunConvert} disabled={!workspace}>Dry Run (.java)</button>
          <button onClick={runBatchConvert} disabled={!workspace}>Batch Convert (.java)</button>
          <button onClick={saveConverted} disabled={!converted || !workspace}>Save Converted</button>
          <span style={{ marginLeft: 'auto', opacity: 0.75 }}>
            Lang: {language} {language === 'java' ? '→ TypeScript' : ''}
          </span>
        </div>
        <DiffEditor
          original={original || '// Open a file to view source'}
          modified={converted || '// Converted output will appear here'}
          language={language}
        />
      </main>

      {/* Right: Inspector */}
      <section style={{ borderLeft: '1px solid #e5e5e5', display: 'grid', gridTemplateRows: '40px 1fr' }}>
        <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #e5e5e5' }}>Issues | Explain | Tasks</div>
        <div style={{ padding: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflow: 'auto' }}>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Notes</div>
          <ul>
            <li>Visibility → public default</li>
            <li>System.out.println → console.log</li>
            <li>static main → static main(): void</li>
          </ul>

          {dryRunResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <strong>Dry Run Preview</strong>
              <ul>
                {dryRunResults.map((r) => (
                  <li key={r.filePath} style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600 }}>{r.filePath}</div>
                    {r.error ? (
                      <div style={{ color: 'crimson' }}>Error: {r.error}</div>
                    ) : (
                      <pre style={{ whiteSpace: 'pre-wrap' }}>{r.diff || '(no changes)'}</pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {batchResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <strong>Batch Results</strong>
              <ul>
                {batchResults.map((r) => (
                  <li key={r.filePath} style={{ marginTop: 6 }}>
                    {r.error ? (
                      <span style={{ color: 'crimson' }}>{r.filePath}: {r.error}</span>
                    ) : (
                      <span>{r.filePath} → written</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Console */}
      <div style={{ gridColumn: '1 / span 3', borderTop: '1px solid #e5e5e5', padding: 6, overflow: 'auto' }}>
        <pre style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{logs}</pre>
      </div>
    </div>
  );
}

// ===== Mount =====
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
