// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { calcPresentation } from "./sizeCalc";
import { SizeService } from "./sizeService";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('File Size extension is active');

  // Register the file size decoration provider
  const provider = new FileSizeDecorationProvider(context);
  const disposableProvider =
    vscode.window.registerFileDecorationProvider(provider);
  context.subscriptions.push(disposableProvider);
}

// FileDecorationProvider that shows file/folder sizes with a compact magnitude badge
class FileSizeDecorationProvider implements vscode.FileDecorationProvider {
  private readonly _emitter = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  >();
  readonly onDidChangeFileDecorations = this._emitter.event;
  private readonly sizes: SizeService;
  private computeFolders = true;
  private excludeSet = new Set<string>();

  constructor(context: vscode.ExtensionContext) {
    // Services
    this.sizes = new SizeService(8);
    this.readConfigAndApply();

    // Invalidate caches on FS changes and refresh decorations for impacted URIs and their parents
    const watcher = vscode.workspace.createFileSystemWatcher("**");
    const handle = (uri: vscode.Uri) => {
      const changed = this.sizes.invalidateAndCollectUris(uri);
      this._emitter.fire(changed);
    };
    watcher.onDidCreate(handle, undefined, context.subscriptions);
    watcher.onDidChange(handle, undefined, context.subscriptions);
    watcher.onDidDelete(handle, undefined, context.subscriptions);
    context.subscriptions.push(watcher);

    // Refresh all when settings change (scale or folder options)
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration("file-size.scale") ||
          e.affectsConfiguration("file-size.computeFolders") ||
          e.affectsConfiguration("file-size.excludeFolders")
        ) {
          const prevCompute = this.computeFolders;
          const prevExcl = new Set(this.excludeSet);
          this.readConfigAndApply();

          if (
            prevCompute !== this.computeFolders ||
            !this.setsEqual(prevExcl, this.excludeSet)
          ) {
            this.sizes.clearCaches();
          }
          this._emitter.fire(undefined);
        }
      }),
    );
  }

  private readConfigAndApply() {
    const cfg = vscode.workspace.getConfiguration("file-size");
    this.computeFolders = cfg.get<boolean>("computeFolders", true);
    const excludes = cfg.get<string[]>("excludeFolders", [
      "node_modules",
      ".git",
      "venv",
      ".venv",
    ]);
    this.excludeSet = new Set(excludes);
    this.sizes.updateConfig({
      computeFolders: this.computeFolders,
      excludeFolders: this.excludeSet,
    });
  }

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) {
      return false;
    }
    for (const v of a) {
      if (!b.has(v)) {
        return false;
      }
    }
    return true;
  }

  private isExcluded(uri: vscode.Uri): boolean {
    const parts = uri.path.split("/");
    const name = parts[parts.length - 1] || uri.path;
    return this.excludeSet.has(name);
  }

  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    // Suppress decoration for excluded folders
    if (this.isExcluded(uri)) {
      return undefined;
    }

    const cached = this.sizes.getCached(uri);
    if (cached) {
      if (cached.type & vscode.FileType.Directory) {
        if (!this.computeFolders) {
          return undefined;
        }
      }
      return this.buildDecoration(uri, cached.bytes);
    }
    this.sizes.requestSize(uri).then(() => this._emitter.fire(uri));

    // Loading placeholder only when computing folders is enabled
    if (this.computeFolders) {
      return {
        badge: "..",
        tooltip: "Calculating size…",
      };
    }
    return undefined;
  }

  private buildDecoration(
    uri: vscode.Uri,
    bytes: number,
  ): vscode.FileDecoration | undefined {
    const cfg = vscode.workspace.getConfiguration("file-size");
    const scale = cfg.get<"log2" | "log10">("scale", "log2");
    const pres = calcPresentation(bytes, scale);
    return { badge: pres.badge, tooltip: pres.label };
  }

  // size computation moved to SizeService

  // humanize moved to sizeCalc.ts via calcPresentation
}
// This method is called when your extension is deactivated
export function deactivate() {}
