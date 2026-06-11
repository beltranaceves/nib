# README

## TODOs
- Bug: ctrl+shift shortcut not working inside focused editor
- Missing: drag and drop
- Missing: command palette
- Missing: insert snippet at cursor, with snippet preview
- Missing: rendered markdown inside snippets
- Bug: tab does not behave correctly anywhere (taskbar, snippets, etc)
- Bug: arrows dont behave correctly anywhere (taskbar, snippets, etc)
- Missing: alt to focus taskbar
- Missing: shortcut to toggle sidebar (ctrl+b)
- Missing: undo/redo

## About

This is the official Wails Svelte template.

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.
