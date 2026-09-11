# SSAIT Athlete360

Offline-first training log for athletes and coaches. SSAIT Athlete360 ships as a desktop app: an Electron shell that launches a self-contained Next.js server and stores everything locally in SQLite (libSQL) — no account, no network required.

- **Downloads:** [Releases](https://github.com/C1131-G/AthleteHub/releases/latest)
- **Platform:** Windows x64

---

## Install

The installer is published on the [latest release](https://github.com/C1131-G/AthleteHub/releases/latest) page. Replace `0.0.1` below with the version you are installing.

### Windows

Download `SSAIT-Athlete360-0.0.1-win-x64.exe` and run it. The installer is per-user (no admin rights) and lets you choose the install directory.

Unsigned builds trigger SmartScreen: click **More info → Run anyway**.

From PowerShell:

```powershell
$version = "0.0.1"
$exe = "$env:TEMP\SSAIT-Athlete360-Setup.exe"
Invoke-WebRequest "https://github.com/C1131-G/AthleteHub/releases/download/v$version/SSAIT-Athlete360-$version-win-x64.exe" -OutFile $exe
Start-Process $exe -Wait
```

**Portable (no installer):** download `SSAIT-Athlete360-0.0.1-win-x64.zip`, extract it anywhere, and run `SSAIT Athlete360.exe`.

---

## Develop

Requires [Bun](https://bun.sh) 1.4+ and Node.js 24+.

```bash
bun install
bun run dev
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Next.js dev server in the browser (data goes to localStorage, not SQLite) |
| `bun run electron:dev` | Electron shell against the dev server |
| `bun run electron:preview` | Production build inside Electron, unpackaged |
| `bun run check` / `bun run fix` | Lint and format |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test features lib` | Unit tests |
| `bun run test:instant` | Playwright navigation suite |

### Where the data lives

Every collection — athletes, equipment, reports, assessments, conditioning, training plans, monthly cycles, and sessions — is stored in SQLite in the Electron main process and reached from the renderer over IPC. `bun run dev` in a plain browser has no main process, so it falls back to a localStorage-backed implementation of the same interface: the services, validation, and duplicate rules are identical, only the storage differs. Backups live under `<userData>/backups`, written on quit and kept for the last seven runs, and **Settings → Backup** exports and restores a portable JSON bundle.

## Build installers

Packaging always starts from a clean tree — `dist:prepare` removes `.next` and `release`, regenerates the Prisma client, rebuilds the renderer and the backend bundle, then copies the static assets the standalone server needs.

```bash
bun run package:win     # NSIS installer + portable zip
```

Other useful targets:

| Command               | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `bun run package`     | Same as `package:win`                              |
| `bun run package:dir` | Unpacked app tree only — fast packaging smoke test |
| `bun run clean`       | Delete `.next`, `release`, and generated bundles   |
| `bun run clean:all`   | Also delete `node_modules` and test output         |

Everything lands in `release/`.

**Packaging must run on Windows x64.** `@libsql` ships prebuilt native bindings and `scripts/after-pack.mjs` copies the _host's_ copy into the app, so the installer cannot be cross-compiled from another OS. Use the release workflow if you are not on Windows.

## Publish a release

`.github/workflows/release.yml` builds the Windows x64 installer on `windows-latest` and uploads it to a draft GitHub release.

```bash
npm version 0.1.0 --no-git-tag-version   # or edit package.json
git commit -am "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

The workflow attaches the artifacts to a **draft** release; review it on the [releases page](https://github.com/C1131-G/AthleteHub/releases) and publish when the downloads look right. Running the workflow manually (**Actions → Release → Run workflow**) builds the same installer and uploads it as a workflow artifact without touching any release.

Builds are unsigned: no Windows Authenticode certificate is configured, which is why the install steps above include the SmartScreen workaround. Adding a certificate later only requires the corresponding `CSC_*` secrets — no config change.
