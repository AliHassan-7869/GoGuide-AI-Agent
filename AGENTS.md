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
7. **Day-Plan Quality & Tab Filtering:** Never cycle days using modulo math (`% base.length`). Enforce unique attractions and single date source of truth. Day chips must filter itinerary content in-place with zero page scroll movement.
8. **Section Nav Scroll Offset:** Compute scroll offset dynamically from sticky elements (header + nav + safe area + 12-16px gap). Never use hard-coded pixel scroll offsets. Lock tab highlight during tap scroll animations (`isTabScrollLocked`) to prevent flickering. Provide a bottom spacer so the final section (Budget) can scroll cleanly to its heading.
9. **Chatbar & Keyboard Docking:** Chat input bar must sit flush on top of virtual keyboard (0px dead space). Never double-count `insets.bottom` when the screen is inside a tab navigator. Keep chat bars compact: container `paddingVertical: 8`, input `minHeight: 40-44px`, send button `40-44px` vertically centered with single-line input.
10. **Verification:** Always run `npx expo export -p web` to verify 0 compilation errors across all routes before concluding any task.

