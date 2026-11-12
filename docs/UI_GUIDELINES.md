# GoGuide AI — Design System & UI/UX Guidelines

## 1. Central Tokens Reference
All styling must strictly consume tokens from:
`app/GoGuide/Components/constants/theme.js`

### Never hard-code one-off colors, spacing, or font sizes.

### Color Tokens
* **Brand Signature Accent:** `Colors.PRIMARY` / `theme.primary` / `theme.accent` = `#0A7EA4` (Teal-blue).
* **AI Feature Highlight:** `#8B5CF6` / `#7C3AED` (Purple, strictly for AI badges, sparkle icons, and generation state).
* **Dark Theme (Default):**
  - Background: `#0B0F17` (Deep Obsidian Space Navy)
  - Card/Surface: `#161E2E` (Sleek Dark Sapphire Card)
  - Border: `#243044` (Subtle Dark Slate)
  - Text Primary: `#F8FAFC` (Crisp White)
  - Text Subtitle / Meta: `#94A3B8` (Slate 400)
  - Header Border: `#20202F`
* **Light Theme:**
  - Background: `#F1F5F9` (Soft Luxury Slate)
  - Card/Surface: `#FFFFFF` (Pure White)
  - Border: `#E2E8F0` (Crisp Subtle Border)
  - Text Primary: `#0F172A` (Deep Rich Slate 900)
  - Text Subtitle / Meta: `#64748B` (Slate 500)
  - Header Border: `#E2E8F0`

### Spacing Scale
`Spacing.xs: 4`, `Spacing.sm: 8`, `Spacing.md: 12`, `Spacing.lg: 16`, `Spacing.xl: 20`, `Spacing.xxl: 24`, `Spacing.gutter: 16`.

### Radii Scale
`Radius.xs: 6`, `Radius.sm: 8`, `Radius.md: 12`, `Radius.card: 18`, `Radius.pill: 20`, `Radius.full: 9999`.

### Typography Scale
- Font Families: `Outfit-Regular`, `Outfit-Medium`, `Outfit-Bold`.
- Minimum label size: `12px`.
- Minimum body copy: `14px`.
- Section & Screen titles: `16px - 26px`.

---

## 2. Shared Component Library
Always reuse existing components rather than inventing duplicate markup:
* `<ScreenHeader title subtitle onBack rightAction badgeText />` (`Components/ui/ScreenHeader.jsx`): Standard top bar matching `my-bookings.jsx`.
* `<Touchable />` (`Components/ui/Touchable.jsx`): Resilient touchable wrapper handling web & mobile seamlessly.
* `<StepProgressBar />` (`Components/CreateTrip/StepProgressBar.jsx`): Stepper in creation wizards.
* `<StartNewTripCard />` (`Components/MyTrips/StartNewTripCard.jsx`): Hero empty state and saved trips carousel.
* `<ScreenState />` (`Components/ui/ScreenState.jsx`): Standardized loading spinner, error banner, and empty state cards.
* `<FavoriteHeartButton />` (`Components/FavoriteHeartButton.jsx`): Reactive wishlist heart button. 44px; favourited = filled red heart on white, unfavourited = outlined heart; label "Save to favourites" / "Remove from favourites".
* `<EmptyState icon title text actionLabel onAction secondaryLabel onSecondary />` (`Components/ui/EmptyState.jsx`): The My Bookings empty-state pattern. Use it for empty lists, errors ("Try again") and offline states on every page.
* `<Skeleton />` / `<SkeletonCard />` (`Components/ui/Skeleton.jsx`): Pulsing placeholders for hero, cards and day lists while loading. Static when reduce-motion is on. Never fake a loading delay for local data.
* `<FadeInView index />` (`Components/ui/FadeInView.jsx`): Staggered entry (fade + 10px rise, 40ms stagger, 230ms ease-out). Respects reduce-motion.
* `<TypingIndicator />` (`Components/ui/TypingIndicator.jsx`): Three-dot "GoGuide is typing" bubble for the Copilot.
* `useReduceMotion()` (`hooks/useReduceMotion.js`): Skip or shorten every looping/entry animation when it returns true. Always stop `Animated.loop`s in the effect cleanup.
* `tapHaptic()` / `selectHaptic()` (`Components/utils/haptics.js`): Haptics, native only (no-op on web).
* `useBackDismiss(visible, onClose)` (`hooks/useBackDismiss.js`): Android back closes an in-page form/sheet instead of leaving the screen.

## 2b. Motion, States & Accessibility (Part 3)
- **Press feedback:** `Touchable` scales to 0.98 on press (skipped when the element sets its own transform).
- **States:** every list/page has loading (Skeleton), empty (EmptyState), and error/offline (EmptyState + "Try again") states.
- **Accessibility:** every icon-only button has `accessibilityLabel` + `accessibilityRole`; toggles/checkboxes/tabs/chips expose `accessibilityState` (checked/selected/disabled); never rely on colour alone (add a checkmark/label); text at risk of clipping uses `maxFontSizeMultiplier={1.3}`; rows use `minHeight`, not fixed `height`.
- **No doubled labels:** don't put an emoji in front of text that already has an icon (e.g. sparkles icon + "✨").
- **Copy:** British spelling ("Favourites", "Customise"), brand is always "GoGuide", all UI copy in English.
- **Web inputs:** give `TextInput`s inside rows an explicit `width` (web defaults to ~200px and pushes siblings out).

---

## 3. Layout, Container & Carousel Rules
1. **16px Screen Gutters:** Outer scroll views use `paddingHorizontal: 16` (or `Spacing.gutter`).
2. **Edge-to-Edge Carousels:** Horizontal carousels must never be clipped by parent padding. Place `paddingHorizontal: 16` directly in `contentContainerStyle`, keep parent `overflow: 'visible'`, and show peek of next card with snap alignment.
3. **Bottom Padding Rule:** All main scrollable screens must have bottom padding equal to:
   `paddingBottom: insets.bottom + 84` (to guarantee content is never cut off by the floating bottom tab bar or home indicator).
4. **Top Safe Area Rule:** Top headers apply `paddingTop: Math.max(insets.top, 0) + 4` inside the header itself so the header surface background extends seamlessly behind the status bar. Never apply safe top padding to the outer root container.
5. **Section Nav Dynamic Scroll Offset:**
   - Scroll target offset = height of all sticky bars pinned at the top (header + sticky section nav + pinned chips) + safe area + consistent `12-16px` gap (standard `14px`). Never hardcode magic numbers (e.g. `-60` or `-140`).
   - On web, set `scrollMarginTop: dynamicOffset` on each section anchor container.
   - Re-evaluate target positions when collapsible cards, day tabs, or fetched data change heights.
   - Lock tab highlight during smooth scroll animation (`isTabScrollLocked`) to prevent flickering across intermediate tabs.
   - Add a bottom spacer (`Math.max(140, Math.round(height * 0.45))`) so the final section (Budget) can scroll all the way to its heading directly below the sticky bars.
6. **Destination Essentials 2×2 Grid:**
   - Display cards in strict 2 rows × 2 columns: Row 1 `[Visa & Entry | Money & Tipping]`, Row 2 `[Emergency | Season]`.
   - Equal column widths (`flex: 1, minWidth: 0`), `12px` (`Spacing.md`) gap, cards in each row stretch to equal height.
   - Body text truncated to 3 lines with ellipsis + `"Read more"` / `"Show less"` expansion button.
7. **Daily Schedule Day Tabs (Filter, Not Scroll):**
   - Day chips act as filter tabs (`"All Days"`, `"Day 1" .. "Day N"`).
   - Tapping a day chip must NEVER scroll the page vertically.
   - Content directly below the chip row is replaced in-place with a subtle `180ms` crossfade (respecting `useReduceMotion`).
   - Selected chip auto-centers horizontally inside the chip row without clipping the last chip.
   - State persists across in-trip edits (Add Activity, Delete + Undo, Log Expense, Route Map, Done checkbox).

---

## 4. Keyboard Docking & Input Rules
1. **Flush Keyboard Docking (0px Dead Space):**
   - Use `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
   - On iOS, set `keyboardVerticalOffset` dynamically to the exact height of content above the avoiding view: `safeTopPadding + headerHeight + (chipsHeight || 0)`.
   - On Android, use `windowSoftInputMode: "adjustResize"` without double-offsetting.
2. **Tab Navigator Insets Hygiene (No Double Counting):**
   - When a screen sits inside a tab navigator, the tab bar already absorbs `insets.bottom`.
   - When the keyboard is closed, the chat bar sits directly above the tab bar with compact `8px` padding. Do NOT add `insets.bottom` on top of the tab bar.
   - When the virtual keyboard opens, the chat bar sits flush directly on top of the keyboard with `paddingBottom: 8` (zero dead pixel gap).
3. **Compact Chatbar Dimensions:**
   - Container: `paddingVertical: 8`, `paddingHorizontal: 14` (12–16px), `borderTopWidth: 1`, `flexDirection: "row"`, `alignItems: "flex-end"`.
   - Input: `minHeight: 40`, `maxHeight: 112` (~4 lines then scrolls), `borderRadius: 20`, `paddingHorizontal: 14`, `paddingTop: 8-10`, `paddingBottom: 8-10`, `fontSize: 14`, `lineHeight: 20`.
   - Send Button: `40px × 40px`, `borderRadius: 20`, `alignSelf: "flex-end"`. Vertically centered with single-line input and aligned to bottom on multiline.
4. **Mobile Web & PWA Viewport:**
   - Viewport meta tag must include `interactive-widget=resizes-content` in `+html.jsx` so mobile browser virtual keyboards resize the visual viewport cleanly.
   - Listen to `window.visualViewport` on web to auto-scroll chat lists to bottom on mobile focus.
5. **Scroll View Configuration:** All form and chat lists must set `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
6. **Touch Target Standard:** All interactable controls, buttons, and clear icons must have a minimum touch target of `44px × 44px` (add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` where needed).

---

## 5. Day-Plan Quality & Generation Rules
1. **No Modulo Cycling:** Never repeat base days with modulo math.
2. **Validator Invariants:**
   - Day count == requested duration.
   - Zero duplicate attraction names across all days.
   - Unique, descriptive theme title per day.
   - 2 to 5 ordered stops per day: Morning -> Afternoon -> Evening.
   - Day 1 (arrival) and last day (departure) must be lighter itineraries.
3. **Geographic Cohesion:** Activities within each day must be clustered in the same neighborhood or transit corridor.
4. **Single Source of Truth:** Flight times, hotel stays, day headers, and duration strings must derive from the single canonical trip record.

---

## 6. Pre-Commit Quality Checklist
Before completing any UI or data refactoring task, verify:
- [ ] No hardcoded one-off colors (use `theme.bg`, `theme.card`, `theme.border`, `theme.text`, `theme.primary`).
- [ ] No text under 12px; touch targets >= 44px.
- [ ] Header uses `<ScreenHeader>` with teal `#0A7EA4` title & back arrow.
- [ ] Bottom padding allows complete clearance of bottom tab bar.
- [ ] Keyboard docks flush with zero gap on iOS/Android.
- [ ] Static export build passes with zero errors: `npx expo export -p web`.

