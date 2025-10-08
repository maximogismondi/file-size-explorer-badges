import * as vscode from "vscode";

export interface Entry {
  bytes: number;
  type: vscode.FileType;
}

export class SizeService {
  private readonly sizeCache = new Map<string, Entry>(); // uri string -> { bytes, type }
  private readonly inFlight = new Map<string, Promise<Entry>>();
  private readonly concurrency: number;

  // dynamic config
  private computeFolders = true;
  private excludeFolders = new Set<string>();

  constructor(concurrency = 8) {
    this.concurrency = Math.max(1, concurrency | 0);
  }

  updateConfig(opts: { computeFolders: boolean; excludeFolders: Set<string> }) {
    this.computeFolders = !!opts.computeFolders;
    this.excludeFolders = new Set(opts.excludeFolders || []);
  }

  clearCaches() {
    this.sizeCache.clear();
    this.inFlight.clear();
  }

  getCached(uri: vscode.Uri): Entry | undefined {
    return this.sizeCache.get(uri.toString());
  }

  requestSize(uri: vscode.Uri): Promise<Entry> {
    const key = uri.toString();
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const p = this.computeSize(uri).then(
      (entry) => {
        this.sizeCache.set(key, entry);
        this.inFlight.delete(key);
        return entry;
      },
      (_err) => {
        this.inFlight.delete(key);
        return { bytes: 0, type: vscode.FileType.Unknown } as Entry;
      },
    );
    this.inFlight.set(key, p);
    return p;
  }

  invalidateAndCollectUris(uri: vscode.Uri): vscode.Uri[] {
    const urisToRefresh: vscode.Uri[] = [];
    // Clear this uri and all parents up to workspace root
    let cur: vscode.Uri | undefined = uri;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.toString())) {
      const key = cur.toString();
      this.sizeCache.delete(key);
      this.inFlight.delete(key);
      urisToRefresh.push(cur);
      seen.add(key);
      const parentPath = cur.path.replace(/\/[^\/]*$/, "") || "/";
      if (parentPath === cur.path) {
        break;
      }
      cur = cur.with({ path: parentPath });
    }
    return urisToRefresh;
  }

  private basename(uri: vscode.Uri): string {
    const parts = uri.path.split("/");
    return parts[parts.length - 1] || uri.path;
  }

  private async computeSize(uri: vscode.Uri): Promise<Entry> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const isFile = !!(stat.type & vscode.FileType.File);
      const isDir = !!(stat.type & vscode.FileType.Directory);

      if (isFile) {
        return { bytes: stat.size, type: vscode.FileType.File };
      }

      if (isDir) {
        // Skip heavy work when folders disabled
        if (!this.computeFolders) {
          return { bytes: 0, type: vscode.FileType.Directory };
        }
        // Skip excluded folder names entirely
        const name = this.basename(uri);
        if (this.excludeFolders.has(name)) {
          return { bytes: 0, type: vscode.FileType.Directory };
        }
        const total = await this.computeDirectorySize(uri);
        return { bytes: total, type: vscode.FileType.Directory };
      }

      return { bytes: 0, type: stat.type };
    } catch {
      return { bytes: 0, type: vscode.FileType.Unknown };
    }
  }

  private async computeDirectorySize(dir: vscode.Uri): Promise<number> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
      return 0;
    }

    // Filter out excluded directories by name
    const filtered = entries.filter(([name, type]) => {
      if (type & vscode.FileType.Directory) {
        return !this.excludeFolders.has(name);
      }
      return true;
    });

    const childUris = filtered.map(([name]) => vscode.Uri.joinPath(dir, name));

    const workers: Promise<void>[] = [];
    let index = 0;
    let total = 0;
    const worker = async () => {
      while (index < childUris.length) {
        const i = index++;
        const child = childUris[i];
        try {
          const entry = await this.computeSize(child);
          total += entry.bytes;
        } catch {
          // ignore errors, continue
        }
      }
    };
    const n = Math.min(this.concurrency, childUris.length);
    for (let i = 0; i < n; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return total;
  }
}
