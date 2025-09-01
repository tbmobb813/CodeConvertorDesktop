ipcMain.handle("workspace:open", async () => {
ipcMain.handle("file:read", async (_e, filePath: string) => {
ipcMain.handle("file:write", async (_e, filePath: string, content: string) => {

// ===== electron/main.ts =====
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsc from 'node:fs';


let win: BrowserWindow | null = null;
let lastRoot: string | null = null;


const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'out']);


async function createWindow() {
win = new BrowserWindow({
width: 1280,
height: 800,
webPreferences: {
preload: path.join(__dirname, 'preload.js'),
contextIsolation: true,
nodeIntegration: false,
sandbox: true
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


// ---------- Helpers ----------
// ---- File/folder operations IPC ----
ipcMain.handle('fs:create', async (_e: unknown, p: string, isDir: boolean) => {
	if (isDir) await fs.mkdir(p, { recursive: true });
	else { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, ''); }
	return true;
});
ipcMain.handle('fs:rename', async (_e: unknown, from: string, to: string) => { await fs.rename(from, to); return true; });
ipcMain.handle('fs:delete', async (_e: unknown, p: string) => {
	const st = await fs.stat(p).catch(() => null);
	if (!st) return true;
	if (st.isDirectory()) await fs.rm(p, { recursive: true, force: true });
	else await fs.unlink(p);
	return true;
});

// ---- Conversion helpers (mocked for now) ----
async function convertCode(code: string, filePath: string): Promise<{ converted: string; diagnostics: any[]; error: string | null }> {
	// TODO: Replace with real conversion logic
	return {
		converted: code + "\n// [converted]", // mock
		diagnostics: [],
		error: null,
	};
}

// ---- Batch Conversion IPC ----
ipcMain.handle("conversion:batch", async (_e: unknown, filePaths: string[]) => {
	const results = [];
	for (const filePath of filePaths) {
		try {
			const code = await fs.readFile(filePath, "utf8");
			const res = await convertCode(code, filePath);
			results.push({
				filePath,
				original: code,
				converted: res.converted,
				diagnostics: res.diagnostics,
				error: res.error,
			});
		} catch (err) {
			let errorMsg = "Unknown error";
			if (err instanceof Error) errorMsg = err.message;
			results.push({ filePath, error: errorMsg });
		}
	}
	return { results };
});

// ---- Improved Dry Run IPC ----
ipcMain.handle("conversion:dryrun", async (_e: unknown, filePaths: string[]) => {
	const previews = [];
	for (const filePath of filePaths) {
		try {
			const code = await fs.readFile(filePath, "utf8");
			const res = await convertCode(code, filePath);
			previews.push({
				filePath,
				original: code,
				converted: res.converted,
				diagnostics: res.diagnostics,
				error: res.error,
				diff: res.converted !== code ? "[diff available]" : null, // mock diff
			});
		} catch (err) {
			let errorMsg = "Unknown error";
			if (err instanceof Error) errorMsg = err.message;
			previews.push({ filePath, error: errorMsg });
		}
	}
	return { previews };
});
export type FsNode = { type: 'dir' | 'file'; name: string; path: string; children?: FsNode[] };


async function readDirRecursive(root: string): Promise<FsNode[]> {
let entries: fsc.Dirent[];
try {
	entries = await fs.readdir(root, { withFileTypes: true });
} catch (e) {
	return [];
}
const results: FsNode[] = [];
for (const e of entries) {
	const full = path.join(root, e.name);
	if (e.isDirectory()) {
		if (IGNORE_DIRS.has(e.name)) continue;
		results.push({ type: 'dir', name: e.name, path: full, children: await readDirRecursive(full) });
	} else if (e.isFile()) {
		results.push({ type: 'file', name: e.name, path: full });
	}
}
// sort: dirs first, then files, alpha
results.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
return results;
