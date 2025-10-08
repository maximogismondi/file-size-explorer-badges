## File Size — Explorer badges for file/folder sizes

Show a compact size badge beside every file and folder in the Explorer. Hover for the human‑readable size.

### Features
- Badges display within‑unit exponent and unit letter (e.g., `9K` for 512 KiB when using log2).
- Folders compute recursively with caching and in‑flight de‑duplication.
 While computing, a `..` placeholder is shown (folders only when folder computation is enabled).
- Hover displays just the formatted size (e.g., `95.4 MiB`).

### Settings
- `file-size.scale`: Choose the magnitude scale
	- `log2` (default): 1024‑based units (B, KiB, MiB, GiB, TiB)
	- `log10`: 1000‑based units (B, KB, MB, GB, TB)
 - `file-size.computeFolders` (default: `true`): Compute and show sizes for folders. When `false`, folders are not decorated and their sizes are not computed.
 - `file-size.excludeFolders`: List of folder names to ignore when computing directory sizes and to suppress decoration for those folders (exact name match). Examples: `node_modules`, `.git`, `venv`, `.venv`.

### Notes
- The Explorer badge area is very small; we keep badges ≤ 2 characters by design.
- Large folders are computed with limited concurrency to avoid overwhelming the system.
 - Changing any File Size setting clears caches and refreshes decorations.

### Requirements
No additional requirements.

### Known Issues
- Extremely large folder trees may take time to compute on first run; cached thereafter.

### Release Notes

#### 0.1.0
- Initial public version: size badges for files/folders, loading placeholder, configurable scale, simple hover.

---

Thanks for trying File Size! If you have feedback, please open an issue.

### Attribution
App icon: Data Storage (Special Lineal Color) by Freepik — sourced from Flaticon. Free for personal and commercial use with attribution. https://www.flaticon.com/free-icons/data-storage
