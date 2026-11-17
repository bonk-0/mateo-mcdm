# Release notes

User-facing notes for each release, in English and Turkish. Keep the two files in step.

- [Phase 1 (English)](phase-1.en.md)
- [Phase 1 (Türkçe)](phase-1.tr.md)

## Installers

The `Release installers` workflow (`.github/workflows/release.yml`) builds Windows (`.exe`, `.msi`), macOS (`.dmg`) and Linux (`.deb`, `.AppImage`) installers from the locked dependency set (`pnpm install --frozen-lockfile`, `cargo --locked`). Run it from the Actions tab or push a `v*` tag.

Signing is optional. Add these repository secrets to sign:

| Secret | Used for |
|---|---|
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY` | macOS signing |
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri update signatures |

Windows Authenticode signing needs a certificate that is not set up yet; Windows installers are unsigned until then, and SmartScreen will warn on first run.
