# GoGuide AI — Agent Development Rules & Code Guidelines

> **IMPORTANT:** Read `docs/UI_GUIDELINES.md` and `docs/PROJECT_BRIEF.md` before making any code modifications.

## Mandatory Rules for AI Agents:
1. **Never rename or remove existing routes, props, DB schema fields, or endpoints.**
2. **Never hard-code colors, spacing, or font sizes.** Always import tokens from `app/GoGuide/Components/constants/theme.js`.
   - Brand Accent: `#0A7EA4`
   - Dark Theme: bg `#0B0F17`, card `#161E2E`, border `#243044`
   - Light Theme: bg `#F1F5F9`, card `#FFFFFF`, border `#E2E8F0`
3. **Minimum text size:** 12px for labels, 14px for body copy.
4. **Minimum touch target:** 44px × 44px (use `hitSlop` on small icons).
5. **Always use `<ScreenHeader />`** (`app/GoGuide/Components/ui/ScreenHeader.jsx`) for top bars.
6. **Scroll bottom padding:** Always add `paddingBottom: insets.bottom + 84` on primary tab/scroll views.
7. **Day-Plan Quality:** Never cycle days using modulo math (`% base.length`). Enforce unique attractions and single date source of truth.
8. **Verification:** Always run `npx expo export -p web` to verify 0 compilation errors across all routes before concluding any task.

