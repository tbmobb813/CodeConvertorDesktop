declare global {
  interface Window {
    api: {
      openWorkspace: (opts?: any) => Promise<{ root: string; tree: any[] } | null>;
      readFile: (p: string) => Promise<string>;
      writeFile: (p: string, c: string) => Promise<boolean>;
      createFileOrDir: (p: string, isDir: boolean) => Promise<boolean>;
      renameFileOrDir: (from: string, to: string) => Promise<boolean>;
      deleteFileOrDir: (p: string) => Promise<boolean>;
      batchConvert: (filePaths: string[]) => Promise<any>;
      dryRun: (filePaths: string[]) => Promise<any>;
    };
  }
}
export {};
