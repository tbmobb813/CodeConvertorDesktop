# Suggested UI Tweaks for CodeConvertor Desktop MVP

1. **File Selection Integration**
   - Replace hardcoded `"selectedFile.java"` in dry run logic with the actual selected file's name and extension.
   - Display the selected file name in the toolbar or above the diff editor for clarity.

2. **Tree Component**
   - Implement a real file tree so users can browse and select files, not just a placeholder.

3. **Diff Editor**
   - Use Monaco’s diff editor for a side-by-side view, improving clarity for code changes.

4. **Conversion Status**
   - Add a status indicator (e.g., “Ready”, “Converted”, “Validated”) in the toolbar to show pipeline progress.

5. **Diagnostics Panel**
   - Make diagnostics collapsible or highlight errors/warnings for better visibility.

6. **Console Output**
   - Auto-scroll to the latest log entry and allow users to clear the console.

7. **Button States**
   - Disable/enable buttons based on context (e.g., disable “Dry Run” if no conversion, “Accept & Write” if already written).

8. **Theme Consistency**
   - Use consistent colors, spacing, and font sizes for a more polished look.

> These enhancements will make the app more intuitive, visually appealing, and user-friendly.
