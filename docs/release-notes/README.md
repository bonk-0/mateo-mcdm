# Release notes

User-facing notes for each release, in English and Turkish. Keep the two files in step.

- [Phase 1 (English)](phase-1.en.md)
- [Phase 1 (Türkçe)](phase-1.tr.md)

## Web build

Mateo is a web app. The `Release web build` workflow (`.github/workflows/release.yml`) builds it from the locked dependency set (`pnpm install --frozen-lockfile`) and uploads `mateo-web.zip`: the complete app as static files. Run it from the Actions tab or push a `v*` tag.

To publish, serve the files of the archive over HTTPS from any folder of any static host. No server code, rewrites or special headers are needed: routes live in the URL hash, the Content Security Policy is in `index.html`, and the service worker makes the app work offline after the first visit. A host that can set headers may also send the same policy as a header, with `frame-ancestors 'none'` added.
