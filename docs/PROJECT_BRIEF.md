# GoGuide AI — Project Brief & Master Plan (Parts 1–4)

## Overview & Vision
GoGuide AI is a premium, AI-powered travel planning companion and real-time co-pilot mobile application built with React Native / Expo, featuring a calm luxury dark aesthetic (Deep Obsidian Navy `#0B0F17`, Sleek Dark Sapphire Card `#161E2E`, and signature Teal-Blue Accent `#0A7EA4`), backed by a high-performance Python FastAPI orchestration layer.

---

## 4-Part Roadmap
* **Part 1 (Current):** Foundation, P0 layout & keyboard bugs, day-plan quality (eliminating modulo day cycling, canonical trip date & origin source of truth, post-generation validator, copy cleanup).
* **Part 2:** Generated Itinerary Screen redesign (full-bleed photography, fluid day timeline, hotel stays, activity cards, map integration).
* **Part 3:** Favourites + all Profile pages, Interests wizard, Home, Discover, Copilot polish, loading/motion/accessibility, final consistency audit.
* **Part 4:** Competitive Features: Google Maps + optimized routes, real-time flight/hotel/transport prices, trip within actual budget, personalized recommendations, booking integration, in-trip live AI assistant.

---

## Core Safety Rules (Apply to ALL parts)
1. **Never rename/remove:** Routes, props, API endpoints, store keys, DB fields. Do NOT touch auth or navigation structure. No new dependencies without explicit permission.
2. **Reuse & extend:** Reuse existing components; no duplicates. Remove a style only after replacing it everywhere.
3. **Preserve working features:** Add Activity, Log Expense, Route Map, Directions, Map, delete activity, Save to Trips, Add Calendar, Live Routes, Packing, Download PDF, Book links, Skyscanner/Google Flights, Chat AI, Plan AI Trip, favourites, bookings.
4. **Git & verification hygiene:** One git branch/commit per part. Run lint + typecheck + build + tests, report results, list manual checks, then STOP.
5. **Root cause resolution:** Fix root causes, not workarounds. No hardcoded one-off colors or sizes. If unsure, ask.
6. **Strict scope isolation:** Do NOT start work belonging to later parts.

---

## Part 1 Specifications & Acceptance Criteria

### B. Design System
- Token file: `app/GoGuide/Components/constants/theme.js` (colors, spacing 4/8/12/16/24, radii, type scale, shadows).
- Brand accent = Teal `#0A7EA4`. Purple `#8B5CF6` reserved only for AI-sparkle accents.
- Follow system theme on ALL screens (`useTheme()` with `useColorScheme()` fallback). Theme-aware status bar.
- Min text sizes: 12px labels / 14px body / 16+ titles. Touch targets >= 44px (48dp Android). Contrast >= 4.5:1.
- 16px gutters. Horizontal carousels edge-to-edge (`paddingHorizontal: 16`, no clipping wrapper), peek of next card, snap.
- Scroll view bottom padding = tab bar height + safe-area inset + 16. Respect top safe area.
- Shared header: back arrow (accent) + title (accent) + grey subtitle + divider (Reference: `safety-alerts.jsx` and `my-bookings.jsx`).

### C. P0 Layout & Keyboard Fixes
1. Eliminate clipping on:
   - "Book on Booking.com" button on stay cards.
   - "Packing" action chip.
   - Day chips ("Day 5").
   - Category chips ("Swiss").
   - Top trip-card carousel cut off at top edge.
   - Safety Alerts "Status" label.
   - "Start a New Travel Plan" pushed against tab bar.
2. AI Copilot Keyboard: input bar sits flush above keyboard (zero gap, safe area not double-counted), auto-scroll to latest on keyboard open, send, and reply; dismiss on drag.
3. Discover Search: on focus, scroll field into view, keep suggestions above keyboard, `keyboardShouldPersistTaps="handled"`, dismiss on scroll, clear (x) button >= 44px touch target.
4. Audit all screens with text inputs for identical keyboard docking behavior.

### D. Day-by-Day Plan Quality & Invariants
1. **Root Cause:** Both backend (`curated_destinations.py`) and frontend (`CuratedPlans.js`) previously used `(d - 1) % len(base_days)`. Never cycle days again.
2. **Post-generation validator:** Day count == requested duration; attractions unique across days; unique day titles; 2-5 stops per day ordered Morning -> Afternoon -> Evening; Day 1 and last day lighter. On failure: retry once feeding errors back; if still short, show "Generate remaining days" instead of repeating.
3. **Generation rules:** Group each day by area; distinct theme per day; long trips add day trips/nearby destinations instead of reusing landmarks; respect weekly closing days; one currency, estimates clearly labeled.
4. **Canonical Date Model:** One trip source of truth (`departureDate` ISO + `totalNoOfDays` + `origin` + `destination` + `travelers` + `budget`). Derive flights, day headers, weather, hotel nights from it. Date chips and duration must always agree.
5. **Flight Origin:** Derived from user input/profile. If missing, prompt user via an airport picker before generating flights. Never default silently to JFK/New York.
6. **Unit tests:** Automated tests for the validator and date derivation functions.

### E. Copy Cleanup
- Standardize British/Commonwealth spelling: "Favourites" (not "Favorites").
- Capitalize categories ("Cities", not "cities").
- Render markdown in AI bubbles (no raw `**` asterisks).
- Discover placeholder: "e.g. 5 days in Istanbul" (short enough to fit on 360px phones).

---

## Part 2 & Part 3 Status & Key Implementations

### 1. Generated Itinerary Architecture & Screen Redesign
- **Sticky Section Nav with Dynamic Offset:**
  - Auto-calculates scroll target offset dynamically: `headerHeight + navHeight + safeTopPadding + 14px gap`.
  - Immune to image loading or content expansions on both Web and Native.
  - Active tab highlight locking (`isTabScrollLocked`) prevents flickering through intermediate tabs during smooth scroll animations.
  - Dynamic bottom spacer ensures the last section (Budget) can scroll all the way to its heading directly below the sticky bars.
- **Destination Essentials (Fixed 2×2 Grid):**
  - Strict 2 rows × 2 columns layout on all viewport widths (including `360px`): `Row 1: [Visa & Entry | Money & Tipping]`, `Row 2: [Emergency | Season]`.
  - 3-line text truncation with `"Read more"` / `"Show less"` expansion toggle.
  - Synchronous fallback (`buildFallbackDestinationEssentials`) eliminates layout shifts on slow or offline networks.
- **Daily Schedule Day Tabs (Filter, Not Scroll):**
  - Chips act as filter tabs (`"All Days"`, `"Day 1" .. "Day N"`).
  - Tapping a day chip replaces the schedule content in-place with a subtle 180ms fade without scrolling the page vertically.
  - Active day chip auto-centers horizontally inside the scrollable chip bar.
  - Selected tab state persists across in-trip actions (Add Activity, Delete + Undo, Log Expense, Route Map, Visited Checkbox).
  - Empty state (`"No activities yet"`) rendered when a day has zero activities.

### 2. AI Copilot Chat Bar & Keyboard Docking
- **Zero-Pixel Flush Keyboard Docking:**
  - Chat bar sits flush directly on top of the virtual keyboard on iOS and Android.
  - Tab navigator safe-area hygiene: avoids double-counting `insets.bottom` when the bottom tab bar is visible.
  - `KeyboardAvoidingView` on iOS uses dynamic `keyboardVerticalOffset` matching content height above the view.
- **Compact Bar Dimensions:**
  - Container: `paddingVertical: 8`, `paddingHorizontal: 14`, `borderTopWidth: 1`.
  - Input: `minHeight: 40`, `maxHeight: 112` (~4 lines then scrolls), `borderRadius: 20`, `paddingHorizontal: 14`, `fontSize: 14`, `lineHeight: 20`.
  - Send button: `40px × 40px`, `borderRadius: 20`, vertically centered with single-line input and pinned to bottom edge when multiline text grows.
- **Web & PWA Mobile Virtual Keyboard:**
  - `interactive-widget=resizes-content` added to viewport meta tag in `+html.jsx`.
  - `visualViewport` listener ensures automatic list scrolling when mobile virtual keyboards open.


