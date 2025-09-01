# CodeConvertor Desktop – Roadmap

## Sprint 1: Core Usability & File Operations

- Implement real file tree (browse, select, open files)
- Enable file open, create, rename, delete, move in workspace
- Display selected file name in toolbar/diff view
- Polish UI: button states, theme consistency, status indicator

## Sprint 2: Conversion & Validation Enhancements

- Integrate batch conversion (multi-file/folder)
- Improve dry run report: show all files to be converted, allow Accept/Skip per file
- Upgrade diagnostics: use Monaco TypeScript worker for real type-checking
- Add conversion status and logs to console panel

## Sprint 3: Explain & Reporting Features

- Add Explain panel: show inline explanations for code changes
- Generate migration report: files changed, TODOs, manual follow-ups
- Support per-workspace config (project.codeconvert.json)

## Sprint 4: Advanced Pipeline & User Experience

## Sprint 5: Polish & Optional Features

## Future Upgrades

- Add move functionality for files and folders (drag-and-drop or button-based)
- Add basic Git awareness (show modified/untracked, open in external client)
- Add command palette for quick actions
- Refine UI based on user feedback
- Prepare for v2 features (offline mode, plugin system, mobile viewer)

- Enhance UI/UX states:
  - Disabled state for buttons when actions are not possible
  - Loading/busy state with spinners or indicators
  - Active/selected state highlights for files, folders, and pipeline steps
  - Visual feedback (color, opacity, icons) for disabled/active/loading
  - Brief success/error messages after operations

---

> This roadmap keeps the app focused, developer-friendly, and ready for real-world use. Adjust sprint order as needed based on feedback and priorities.
