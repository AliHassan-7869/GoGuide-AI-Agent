# GoGuide AI — Future Plan & Post-Launch Roadmap (v1.1 – v2.0)

> **Launch Strategy (v1.0):** Keep the current AI pipeline (`app.py`, `orchestrator.py`, `curated_destinations.py`, `ai_safety.validate_plan`) as-is for v1 launch. It is fast, tested, and avoids external API failure points. Do **not** add extra LLM agents — invest in **deterministic verification and real data grounding** instead.

---

## v1.1 — Deterministic Geo/Fact Verifier (Phase 1: Pure Python, $0 Cost)

Add a lightweight, deterministic Python verifier node after itinerary generation (`orchestrator.py` / `ai_safety.py`) with **zero external API dependencies**:

- **Haversine Distance Check:** Compute exact km distances between Morning → Afternoon → Evening stops within each day.
- **Anti-Zig-Zag Auto-Reordering:** Run nearest-neighbor reordering on each day's stops so routes flow geographically (`A → B → C`) without extra LLM calls.
- **Outlier Coordinate Filter:** Flag or drop stops whose coordinates fall > 50 km outside the destination city center (unless explicitly marked as a Day Trip).

---

## v1.2 — Place Geocoding + Upstash Redis Cache (Phase 2: Free / Low Cost)

Eliminate hallucinated restaurant/attraction names and inaccurate map pins:

- **Real Coordinate Verification:** Verify each generated `placeName + city` via a free geocoding endpoint (e.g., OpenStreetMap Photon / Nominatim with respectful rate limits) and overwrite AI-guessed `lat`/`lng`.
- **Upstash Redis Caching:** Cache verified place results (`{lat, lng, address, verified: true}`) for 30 days using the existing `UPSTASH_REDIS_REST_URL` integration in `app.py` (`< 5 ms` cache hits, `$0` repeat cost).

---

## v2.0 — Pro-Tier Grounding & Part 4 Competitive Features

Unlock once Pro subscriptions cover external API costs:

1. **Google Places API Integration:**
   - Verified star ratings, real addresses, and high-res photos.
   - **Closing-Day Auto-Swap:** Compare each stop's opening hours against the trip's canonical `departureDate` weekday (e.g., if a museum is closed on Tuesday, automatically swap Day 2 and Day 3 in Python).
2. **Live Flight & Hotel Pricing:**
   - Replace tier estimates (`$280 / $650 / $1450` in `orchestrator.py`) with live fare/availability APIs (e.g., Amadeus / Skyscanner / Booking partner APIs).
3. **Tiered AI Model Routing:**
   - Keep Gemini Flash for Free-tier speed; route Pro-tier users to a higher-reasoning model (e.g., Gemini Pro) for complex multi-city trips.
4. **Custom Domain & Branded Auth Emails:**
   - Configure a custom domain (e.g., `goguide.ai`), enable Custom SMTP (Resend / Brevo) in Firebase Auth for `noreply@goguide.ai`, and connect a branded Firebase Auth Action URL (`auth.goguide.ai`).
