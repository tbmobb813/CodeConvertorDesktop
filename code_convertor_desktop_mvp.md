# CodeConvertor Desktop – MVP Scaffold (Electron + React + Monaco + Diff)

This is a minimal, working scaffold for the **Workspace sweet‑spot** app: open a folder, show a tree, select a file, run a mock “Convert → Format → Validate” pipeline, and render **Original vs Converted** with a Monaco diff editor.

> ✅ Copy each file into the indicated path. Then run the commands in **Getting Started**.

---

## 1) `package.json`

```json
{
  "name": "codeconvertor",
  "version": "0.1.0",
  "private": true,
  "main": "dist-electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm:dev:electron\" \"npm:dev:renderer\"",
    "dev:electron": "tsc -w -p electron && nodemon --watch dist-electron --exec electron dist-electron/main.js",
    "dev:renderer": "vite",
    "build": "rimraf dist dist-electron && tsc -p electron && vite build",
    "start": "electron dist-electron/main.js"
  },
  "devDependencies": {
    "@types/node": "^22.5.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "concurrently": "^8.2.2",
    "electron": "^31.2.1",
    "monaco-editor": "^0.51.0",
    "nodemon": "^3.1.3",
    "rimraf": "^6.0.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.2"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

---

## 2) `tsconfig.json` (root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "types": ["node"],
    "paths": {
      "@/": ["src/*"]
    }
  },
  "include": ["src", "electron"]
}
```

---

## 3) `electron/tsconfig.json`

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../dist-electron",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "noEmit": false
  },
  "include": ["./**/*.ts"]
}
```

---

## 4) `electron/main.ts`

```ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

let win: BrowserWindow | null = null;

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;
  const url = isDev ? 'http://localhost:5173' : `file://${path.join(process.cwd(), 'dist', 'index.html')}`;
  await win.loadURL(url);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- File system helpers ----
async function readDirRecursive(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result: any[] = [];
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      result.push({ type: 'dir', name: e.name, path: full, children: await readDirRecursive(full) });
    } else {
      result.push({ type: 'file', name: e.name, path: full });
    }
  }
  return result;
}

ipcMain.handle('workspace:open', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  const root = res.filePaths[0];
  const tree = await readDirRecursive(root);
  return { root, tree };
});

ipcMain.handle('file:read', async (_e, filePath: string) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('file:write', async (_e, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return true;
});
```

---

## 5) `electron/preload.ts`

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openWorkspace: () => ipcRenderer.invoke('workspace:open'),
  readFile: (p: string) => ipcRenderer.invoke('file:read', p),
  writeFile: (p: string, c: string) => ipcRenderer.invoke('file:write', p, c)
});

export {};
```

> **Renderer typing:** Create `src/global.d.ts` with:

```ts
declare global {
  interface Window {
    api: {
      openWorkspace: () => Promise<{ root: string; tree: any[] } | null>;
      readFile: (p: string) => Promise<string>;
      writeFile: (p: string, c: string) => Promise<boolean>;
    };
  }
}
export {};
```

---

## 6) `index.html` (in `src/`)

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeConvertor</title>
    <style>
      html, body, #root { height: 100%; margin: 0; }
      .app { display: grid; grid-template-columns: 260px 1fr 420px; grid-template-rows: 1fr 180px; height: 100%; }
      .sidebar { border-right: 1px solid #e5e5e5; overflow: auto; }
      .center { display: grid; grid-template-rows: 48px 1fr; }
      .toolbar { display: flex; gap: 8px; align-items: center; padding: 8px; border-bottom: 1px solid #e5e5e5; }
      .right { border-left: 1px solid #e5e5e5; display: grid; grid-template-rows: 40px 1fr; }
      .panel-tabs { display:flex; gap:8px; padding:8px; border-bottom:1px solid #e5e5e5; }
      .console { grid-column: 1 / span 3; border-top: 1px solid #e5e5e5; padding: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow:auto; }
      button { padding: 6px 10px; }
      ul { list-style: none; padding-left: 14px; }
      .file { cursor: pointer; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

---

## 7) `src/main.tsx`

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as monaco from 'monaco-editor';

// Simple tree types
type Node = { type: 'dir' | 'file'; name: string; path: string; children?: Node[] };

function Tree({ nodes, onOpen }: { nodes: Node[]; onOpen: (n: Node) => void }) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.type === 'dir' ? (
            <details open>
              <summary>📁 {n.name}</summary>
              <Tree nodes={n.children ?? []} onOpen={onOpen} />
            </details>
          ) : (
            <div className="file" onClick={() => onOpen(n)}>📄 {n.name}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function DiffEditor({ original, modified, language }: { original: string; modified: string; language: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    editorRef.current = monaco.editor.createDiffEditor(ref.current, { automaticLayout: true, readOnly: false });

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

  return <div style={{ width: '100%', height: '100%' }} ref={ref} />;
}

function App() {
  const [workspace, setWorkspace] = useState<{ root: string; tree: Node[] } | null>(null);
  const [currentFile, setCurrentFile] = useState<Node | null>(null);
  const [original, setOriginal] = useState('');
  const [converted, setConverted] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [logs, setLogs] = useState<string>('');

  async function openWorkspace() {
    const res = await window.api.openWorkspace();
    if (res) setWorkspace(res);
  }

  async function openFile(n: Node) {
    if (n.type !== 'file') return;
    const text = await window.api.readFile(n.path);
    setCurrentFile(n);
    setOriginal(text);
    setConverted('');
    setLanguage(guessLanguageFromName(n.name));
  }

  function guessLanguageFromName(name: string) {
    if (name.endsWith('.java')) return 'java';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
    if (name.endsWith('.js')) return 'javascript';
    if (name.endsWith('.cs')) return 'csharp';
    return 'plaintext';
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
    const rel = currentFile.path.replace(workspace.root, '').replace(/^\\|\//, '');
    const outPath = `${workspace.root}/converted/${rel}`.replace(/\\/g, '/').replace(/\.java$/, '.ts');
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
        {workspace ? <Tree nodes={workspace.tree} onOpen={openFile} /> : <div style={{ padding: 12 }}>Open a folder…</div>}
      </aside>

      <main className="center">
        <div className="toolbar">
          <button onClick={runPipeline} disabled={!original}>Run Pipeline</button>
          <button onClick={saveConverted} disabled={!converted}>Save Converted</button>
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Lang: {language}</span>
        </div>
        <DiffEditor original={original} modified={converted || '// Converted output will appear here'} language={language} />
      </main>

      <section className="right">
        <div className="panel-tabs">Issues | Explain | Tasks</div>
        <div style={{ padding: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Mock conversion notes will appear here.</div>
          <ul>
            <li>Visibility → public default</li>
            <li>System.out.println → console.log</li>
            <li>static main → function main()</li>
          </ul>
        </div>
      </section>

      <div className="console"><pre>{logs}</pre></div>
    </div>
  );
}

// --- Mock converter (replace with real parser/AI later) ---
function mockConvertJavaToTS(src: string): string {
  let out = src;
  out = out.replace(/System\.out\.println/g, 'console.log');
  out = out.replace(/public\s+class\s+(\w+)\s*\{/g, 'class $1 {');
  out = out.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, 'static main(): void {');
  out = out.replace(/String/g, 'string');
  if (!/\bmain\s*\(/.test(out)) {
    out += "\n\n// NOTE: No main() detected.";
  } else if (!/\b\w+\.main\(\)/.test(out)) {
    const m = /class\s+(\w+)/.exec(out);
    if (m) out += `\n\n${m[1]}.main();`;
  }
  return out;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

---

## 8) `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});

---

## 9) Getting Started

```bash
# 1) Initialize
npm i

# 2) Dev mode (Electron + Vite + Monaco)
npm run dev

# 3) Build
npm run build && npm start
```

---

## 10) Next steps (drop-in upgrades)

- **Formatter:** add Prettier for TS/JS — run after conversion.
- **Validator:** run `tsc --noEmit` and surface diagnostics in the right panel.
- **Real conversion engine:** swap `mockConvertJavaToTS()` with a pipeline that uses:
  - A rule-based parser (ANTLR Java → AST) + emitter to TypeScript **or**
  - An AI conversion service (with guardrails/diff checks) when rules fail.
- **Dry run report:** show what will be written, and allow per-file Accept/Skip.
- **Mirror writes:** always write to `<root>/converted/` by default to avoid clobbering.

> You now have an **open‑folder → pick file → run pipeline → diff → save** loop with room to grow into batch conversion and type-checked reports.
