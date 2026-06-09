# Backend Notes

- Go code lives at the repo root.
- `App` in [app.go](../../../app.go) holds backend methods.
- Exported methods on `App` become Wails bindings.
- `startup(ctx)` stores the app context for runtime calls.
- Keep backend logic small and easy to bind.
