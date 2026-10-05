# Publishing Application Updates

This document outlines the procedure for publishing auto-updates for **Fillop CBT Guru**.

## Publishing Steps

1. **Bump Version**:
   - Update the `"version"` field in `desktop/package.json` (e.g., `1.0.1` -> `1.0.2`).

2. **Build Release Binaries**:
   - Run the Windows build command from the `desktop` directory or repo root:
     ```bash
     npm run dist:win -w desktop
     ```
   - This generates release artifacts inside `desktop/release/`.

3. **Upload Artifacts**:
   - Upload the generated files from `desktop/release/` directly into the updates root directory at `https://cbt.filloptech.com/downloads/`:
     - Installer `.exe` file(s)
     - `.blockmap` file(s)
     - `latest.yml`
   - Ensure all files are placed **directly in the `/downloads/` folder** with no sub-folders.

## Critical Notes

- **Updates URL**: The update endpoint (`https://cbt.filloptech.com/downloads/`) configured in `package.json` under `"publish"` must never change, as installed applications query this exact location.
- **Legacy Installs**: Existing users running older builds that do not have `electron-updater` included must manually download and install the first updater-enabled version (v1.0.1+). Subsequent updates will automatically download and install in-app.
