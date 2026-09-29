# AGENTS.md

## Project overview

This is a small static to-do application built with HTML, CSS, and vanilla
JavaScript. It is deployed as a static site and stores task data in the
browser's `localStorage`.

## Development guidelines

- Keep the app dependency-free unless a dependency is clearly necessary.
- Preserve the existing black and burgundy visual style and responsive layout.
- Keep user-facing text accessible and use semantic HTML where possible.
- Reuse the existing local-storage keys and data shape when extending task
  behavior. Maintain compatibility with tasks saved by earlier versions.
- Avoid introducing backend assumptions into this static application.
- Keep changes focused and do not alter unrelated behavior.
- Validate JavaScript syntax before completing a change.

## Testing rule

Write test for all the endpoints that you create and always validate
that these endpoints are working.

Because this project currently has no HTTP API endpoints, validate UI
interactions in a browser whenever behavior changes. At minimum, check the
affected flow and confirm that data persists after a page reload.

## Verification

Run from the project directory:

```bash
node --check script.js
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173` and verify the changed behavior manually.
