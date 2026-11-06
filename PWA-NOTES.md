# Installation and offline support

The manifest uses relative URLs for GitHub Pages project hosting. Icons are original SVG artwork rendered to 192/512px PNG, a 512px maskable PNG, 180px Apple touch icon, and 32px favicon. The central artwork stays inside the maskable safe region.

## Updating

Increment CACHE in sw.js with every release that changes index.html or cached assets. Publish all changed files in one commit. The worker precaches the complete app, waits for open clients to close, and never clears localStorage. No automatic skipWaiting or reload interrupts a study attempt. External references are online-only. Offline readiness is reported only after worker activation.

## Progress

Existing pmp-studio-v2 localStorage remains unchanged. Installation is not synchronization. Chromium normally shares storage with the originating browser profile; iOS standalone apps may use separate storage. Storage can be removed by browser settings, private sessions, OS eviction, or uninstalling. Native device testing is still required.

## Validation

Automated Chromium tests: manifest and icon responses; offline reload and grading; exact saved attempt restoration; waiting worker update; activation after closing app window; mobile-width overflow. Native OS installation UI, iOS Safari/Home Screen transfer, Android launcher behavior, and physical-device performance were not tested.

Sources reviewed 2026-11-06:
- https://web.dev/learn/pwa/installation
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
