interface Window {
  go: any;
}

interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

interface VisibleRow {
  entry: Entry;
  depth: number;
}
