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
* `<FavoriteHeartButton />` (`Components/FavoriteHeartButton.jsx`): Reactive wishlist heart button.

---

## 3. Layout, Container & Carousel Rules
1. **16px Screen Gutters:** Outer scroll views use `paddingHorizontal: 16` (or `Spacing.gutter`).
2. **Edge-to-Edge Carousels:** Horizontal carousels must never be clipped by parent padding. Place `paddingHorizontal: 16` directly in `contentContainerStyle`, keep parent `overflow: 'visible'`, and show peek of next card with snap alignment.
3. **Bottom Padding Rule:** All main scrollable screens must have bottom padding equal to:
   `paddingBottom: insets.bottom + 84` (to guarantee content is never cut off by the floating bottom tab bar or home indicator).
4. **Top Safe Area Rule:** Top headers apply `paddingTop: Math.max(insets.top, 0) + 4` inside the header itself so the header surface background extends seamlessly behind the status bar. Never apply safe top padding to the outer root container.

---

## 4. Keyboard Docking & Input Rules
1. **Flush Keyboard Docking:** Use `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
2. **Dynamic Insets:** When the virtual keyboard is open, input container bottom padding must be `8px - 10px` flush with keyboard top edge. When keyboard is closed, bottom padding expands to `Math.max(insets.bottom, 12)` to respect native home indicators.
3. **Scroll View Configuration:** All form and chat lists must set `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
4. **Touch Target Standard:** All interactable controls, buttons, and clear icons must have a minimum touch target of `44px × 44px` (add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` where needed).

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
