# AthleteHub

Offline-first training log for athletes and coaches. AthleteHub ships as a
desktop app: an Electron shell that launches a self-contained Next.js server and
stores everything locally in SQLite (libSQL) — no account, no network required.

- **Downloads:** [Releases](https://github.com/C1131-G/AthleteHub/releases/latest)
- **Platforms:** Windows x64, macOS (Intel + Apple Silicon), Linux x64

---

## Install

Every installer is published on the
[latest release](https://github.com/C1131-G/AthleteHub/releases/latest) page.
Replace `0.0.1` below with the version you are installing.

### Windows

Download `AthleteHub-0.0.1-win-x64.exe` and run it. The installer is per-user
(no admin rights) and lets you choose the install directory.

Unsigned builds trigger SmartScreen: click **More info → Run anyway**.

From PowerShell:

```powershell
$version = "0.0.1"
$exe = "$env:TEMP\AthleteHub-Setup.exe"
Invoke-WebRequest "https://github.com/C1131-G/AthleteHub/releases/download/v$version/AthleteHub-$version-win-x64.exe" -OutFile $exe
Start-Process $exe -Wait
```

**Portable (no installer):** download `AthleteHub-0.0.1-win-x64.zip`, extract it
anywhere, and run `AthleteHub.exe`.

### macOS

Download the build that matches your chip — `AthleteHub-0.0.1-mac-arm64.dmg`
for Apple Silicon (M1 and newer), `AthleteHub-0.0.1-mac-x64.dmg` for Intel —
open it and drag **AthleteHub** into `Applications`.

The app is not notarized, so Gatekeeper blocks the first launch. Right-click the
app → **Open** → **Open**, or clear the quarantine flag once:

```bash
VERSION=0.0.1
ARCH=$([ "$(uname -m)" = "arm64" ] && echo arm64 || echo x64)
curl -L -o /tmp/AthleteHub.dmg \
  "https://github.com/C1131-G/AthleteHub/releases/download/v$VERSION/AthleteHub-$VERSION-mac-$ARCH.dmg"
hdiutil attach /tmp/AthleteHub.dmg
cp -R "/Volumes/AthleteHub $VERSION/AthleteHub.app" /Applications/
hdiutil detach "/Volumes/AthleteHub $VERSION"
xattr -dr com.apple.quarantine /Applications/AthleteHub.app
```

### Linux

**AppImage** — works on any distribution, nothing to install:

```bash
VERSION=0.0.1
curl -L -o ~/Applications/AthleteHub.AppImage --create-dirs \
  "https://github.com/C1131-G/AthleteHub/releases/download/v$VERSION/AthleteHub-$VERSION-linux-x86_64.AppImage"
chmod +x ~/Applications/AthleteHub.AppImage
~/Applications/AthleteHub.AppImage
```

**Debian / Ubuntu** — `.deb` package, registers a desktop entry:

```bash
VERSION=0.0.1
curl -L -o /tmp/athletehub.deb \
  "https://github.com/C1131-G/AthleteHub/releases/download/v$VERSION/AthleteHub-$VERSION-linux-amd64.deb"
sudo apt install /tmp/athletehub.deb
```

**Tarball** — extract and run, for distributions without dpkg:

```bash
VERSION=0.0.1
curl -L "https://github.com/C1131-G/AthleteHub/releases/download/v$VERSION/AthleteHub-$VERSION-linux-x64.tar.gz" \
  | tar -xz -C ~/Applications
~/Applications/AthleteHub-$VERSION-linux-x64/athletehub
```

If the AppImage fails to start on a minimal system, install the usual Electron
runtime libraries: `libgtk-3-0`, `libnss3`, `libxss1`, `libxtst6`, `libatspi2.0-0`,
`libsecret-1-0`.

---

## Develop

Requires [Bun](https://bun.sh) 1.4+ and Node.js 24+.

```bash
bun install
bun run dev
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Next.js dev server in the browser |
| `bun run electron:dev` | Electron shell against the dev server |
| `bun run electron:preview` | Production build inside Electron, unpackaged |
| `bun run check` / `bun run fix` | Lint and format |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test features lib` | Unit tests |
| `bun run test:instant` | Playwright navigation suite |

## Build installers

Packaging always starts from a clean tree — `dist:prepare` removes `.next` and
`release`, regenerates the Prisma client, rebuilds the renderer and the backend
bundle, then copies the static assets the standalone server needs.

```bash
bun run package:win     # NSIS installer + portable zip
bun run package:mac     # dmg + zip
bun run package:linux   # AppImage + deb + tar.gz
```

Other useful targets:

| Command | What it does |
| --- | --- |
| `bun run package` | Installers for the current platform |
| `bun run package:dir` | Unpacked app tree only — fast packaging smoke test |
| `bun run clean` | Delete `.next`, `release`, and generated bundles |
| `bun run clean:all` | Also delete `node_modules` and test output |

Everything lands in `release/`.

**Each platform must be packaged on its own OS and architecture.** `@libsql`
ships prebuilt native bindings and `scripts/after-pack.mjs` copies the *host's*
copy into the app, so a Windows machine cannot produce a working macOS or Linux
build. Use the release workflow instead of cross-compiling.

## Publish a release

`.github/workflows/release.yml` builds all four targets in parallel —
`windows-latest`, `ubuntu-latest`, `macos-13` (Intel) and `macos-14` (Apple
Silicon) — and uploads every installer to a draft GitHub release.

```bash
npm version 0.1.0 --no-git-tag-version   # or edit package.json
git commit -am "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

The workflow attaches the artifacts to a **draft** release; review it on the
[releases page](https://github.com/C1131-G/AthleteHub/releases) and publish when
the downloads look right. Running the workflow manually
(**Actions → Release → Run workflow**) builds the same matrix and uploads the
installers as workflow artifacts without touching any release.

Builds are unsigned: no Windows Authenticode certificate and no Apple Developer
identity are configured, which is why the install steps above include the
SmartScreen and Gatekeeper workarounds. Adding certificates later only requires
the corresponding `CSC_*` secrets — no config change.
