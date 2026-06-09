---
description: "Use when editing Go files for this Wails app. Covers App bindings, startup, and backend-first guidance."
applyTo: "**/*.go"
---

# Backend

- Keep Go changes small.
- `App` methods in [app.go](../../app.go) are the main Wails bindings.
- `startup(ctx)` is where backend context is stored.
- Explain the change before suggesting code.
- Do not touch `frontend/wailsjs/` from Go work.
