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
