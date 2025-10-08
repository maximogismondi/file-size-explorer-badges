# Change Log

All notable changes to the "file-size" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2025-10-08
### Added
- Respect `file-size.computeFolders`: when disabled, folders are not decorated and their sizes are not computed.
- Respect `file-size.excludeFolders`: excluded folder names are skipped during directory size computation and are not decorated.

- Initial public release
- Explorer badges show within‑unit exponent (e.g., 9K for 512 KiB with log2)
- Recursive folder size with caching and in‑flight de‑duplication
- Loading placeholder while computing
- Hover shows just the human‑readable size