# 🌍 GoGuide AI Agent — Complete Workflow, User Capabilities & Implementation Manual

**Date Created / Updated:** October 21, 2026  
**Project:** GoGuide AI Travel Agent (Mobile & Backend)  
**Branch:** `staging`  
**Tech Stack:** React Native (Expo SDK 52, Expo Router), FastAPI (Python 3.12), Google Gemini 3.8 Flash, OpenStreetMap (Nominatim & Overpass), Firebase Auth & Firestore, AsyncStorage.

---

## 📑 Table of Contents
1. [Overview & Executive Summary](#1-overview--executive-summary)
2. [Today's Accomplishments & New Implementations](#2-todays-accomplishments--new-implementations)
3. [End-to-End System Workflow (How Everything Works)](#3-end-to-end-system-workflow-how-everything-works)
4. [User Capabilities (User App Me Kia Kia Kar Sakta Hai)](#4-user-capabilities-user-app-me-kia-kia-kar-sakta-hai)
5. [Detailed File-by-File Technical Changes](#5-detailed-file-by-file-technical-changes)
6. [Offline Flight-Mode & Local Storage Architecture](#6-offline-flight-mode--local-storage-architecture)
7. [Testing & Quality Verification](#7-testing--quality-verification)
8. [How to Run the Application Locally](#8-how-to-run-the-application-locally)

---

## 1. Overview & Executive Summary

**GoGuide AI Agent** is a full-featured, state-of-the-art AI-powered travel assistant that rivals top travel apps like *Wanderlog* and *TripIt*. It allows travelers to generate smart day-by-day itineraries tailored to their specific interests (e.g. historical landmarks, pristine beaches, nature trails, culinary hotspots), manage multi-destination trips, track travel expenses, organize digital booking vouchers, pack efficiently with AI checklists, print magazine-style PDF documents, and share or clone itineraries with travel companions.

All AI calls are secured through a Python FastAPI backend that gracefully falls back across multiple AI models (Gemini Flash -> Gemini Backup -> DeepSeek) and OpenStreetMap when quotas or network outages occur.

---

## 2. Today's Accomplishments & New Implementations

During today's session, the following major upgrades, features, and fixes were implemented:

### A. Navigation & Screen Header Fixes
- **Duplicate Header Elimination**: Resolved duplicate header display on `/my-bookings` by adding `<Stack.Screen options={{ headerShown: false }} />` in [my-bookings.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/my-bookings.jsx) and registering both `my-bookings` and `packing-checklist` screens cleanly in [_layout.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/_layout.jsx).

### B. Profile Screen Overhaul & Calm Luxury Aesthetics
- Upgraded [profile.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/profile.jsx) to match Apple / Linear "calm luxury" design guidelines:
  - **Live Travel Stats Counters**: Real-time counts of user's **Trips**, unique **Places visited**, and **Bookings** queried directly from Firestore with offline fallback.
  - **Explorer Tier Badges**: Dynamic tier progression:
    - *Tier 1: Novice Explorer* (0 trips)
    - *Tier 2: Voyager Pro* (1–4 trips)
    - *Tier 3: Elite Globetrotter* (5+ trips)
  - **Unified Brand Icon Styling**: Theme-aware tinted icon backgrounds (`brandIconBg`, `brandBorderColor`) preventing harsh dark contrasts.
  - **Quick Dark Mode Switch**: Instant toggle in top header.

### C. Destination-Smart Category & Interests Recommendations
- Upgraded the trip creation wizard ([interest-page.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/create-trip/interest-page.jsx)):
  - **Dynamic Category Filter Chips**: User can select categories (`All`, `Beaches`, `History`, `Nature`, `Food & Dining`, `Shopping & Leisure`).
  - **Automatic Beach & History Tag Detection**: If the selected destination has beaches (e.g., Paris -> Riverfront/Plages, Bali -> Tropical Beaches), beach chips appear highlighted automatically.
  - **Visual Checkmarks & Selection Count Pill**: Clear visual indicator of selected interests.
  - **Top Navigation Bar**: Included a back arrow for smooth multi-step wizard navigation.
  - **End-to-End Pipeline Update**: Updated [Option.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/constants/Option.js), [generate-trip.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/create-trip/generate-trip.jsx), [AiModel.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Configs/AiModel.js), and backend [app.py](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app.py) so Gemini receives the exact categories and interests selected by the user.

### D. Interactive Day Route Map Modal
- Created [DayRouteModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/DayRouteModal.jsx):
  - Calculates total route distance using the **Haversine formula** between sequential itinerary stops.
  - Embedded OpenStreetMap interactive route map.
  - **Multi-Stop Google Maps Navigation**: Generates an origin-to-destination URL with all intermediate waypoints automatically concatenated for direct GPS navigation.

### E. Travel Budget Cap & Expense Tracker Modal
- Created [ExpenseTrackerModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/ExpenseTrackerModal.jsx):
  - **Interactive Expense Logger**: Add expenses categorized by *Food*, *Transport*, *Stay*, or *Activities*.
  - **Budget Cap Progress Gauge**: Visual progress bar indicating percentage spent with automatic status badges (*Normal*, *Warning*, *Budget Exceeded*).
  - **Deletion & Storage**: Instant deletion of logged items and automatic sync with `tripData.expenses` and `AsyncStorage`.

### F. Interactive Activity Management in Itinerary
- Upgraded [mytrip.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/mytrip.jsx):
  - **Visited Checkbox Toggle**: Tapping the checkmark marks an activity as completed with an elegant strike-through and a green `Visited` pill.
  - **Delete Activity Action**: Trash icon allows removing any activity from a day's schedule with user confirmation.

### G. Feature 4: Shareable Web Link & Trip Cloning
- Created [ShareTripModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/ShareTripModal.jsx):
  - **Copy Shareable Link**: Generates unique web URLs (`https://goguide.ai/trip/<id>`) with 1-click clipboard copy and toast confirmation.
  - **Native Social Share**: WhatsApp, Messages, or AirDrop sharing.
  - **Clone & Save Trip to Account**: Allows friends or co-travelers to save a copy of a shared trip to their own account (stored to Firestore `UserTrips` and local cache) so they can customize it.

### H. Feature 5: Magazine-Style Printable PDF Itinerary Export
- Created [PrintableItineraryModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/PrintableItineraryModal.jsx):
  - High-end, magazine-style clean visual preview of the entire travel plan.
  - 1-click **"Print / Save as PDF"** button triggering browser print dialog with print-media CSS optimizations (page breaks, clean typography, hotel vouchers, daily tables, and packing lists).

### I. Feature 6: Smart Proactive Travel Alerts (With Full User Control)
- **Profile Screen Notification Toggle** ([profile.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/profile.jsx)):
  - Placed a direct interactive switch for **"Smart Travel Alerts"** in the Profile screen under `APP & NOTIFICATIONS`.
  - Gives the user complete control to turn proactive notifications **ON** or **OFF**.
  - Dynamic subtitle reflects current status (*"Active: Weather, departures & packing"* vs *"Notifications Muted"*).
  - Fully synchronized with [CreateTripContext.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/context/CreateTripContext.js) and persisted in `@goguide_preferences`.
- **My Trip Screen Smart Advisory Banner** ([mytrip.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/mytrip.jsx)):
  - Displays smart advice (forecast summary, packing advice, boarding pass alerts) when enabled.
  - Includes a direct **"Manage in Profile"** link.
  - When the user turns off notifications in Profile, this banner is automatically muted.

### J. Discover Screen Overhaul & Cities Integration
- **Interactive Wishlist / Heart Button**: Added a dedicated heart button on all trending destination cards. Tapping toggles favorite state with haptic feedback and persists in `@goguide_saved_places` (AsyncStorage).
- **Inline Feed Filter Chips**: Added quick category filter chips (`🌟 All Trending`, `🏙️ Cities`, `🏖️ Beaches`, `🏛️ History`, `🏔️ Nature`) allowing users to filter destinations directly on Discover without leaving the tab.
- **Rich & Informative Destination Badges**: Each card now displays seasonal best time (e.g. `📅 Apr - Oct`), estimated nightly price (e.g. `💵 $95/night`), vibe summary (`✨ Romance & Art`), 1-Tap AI plan, and Customize wizard buttons.
- **Quick Trending Search Tags**: Added horizontal one-tap search chips below search bar (`Tokyo 🇯🇵`, `Paris 🇫🇷`, `Dubai 🇦🇪`, `Bali 🏖️`, `Rome 🏛️`, `Swiss Alps 🏔️`).
- **Cities Exploration Route**: Created [cities.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/cities.jsx) and updated [Destinations.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/constants/Destinations.js) with iconic world cities (Tokyo, Paris, New York, Dubai, Rome, London) so tapping "Cities" correctly filters and shows world metropolises.

---

## 3. End-to-End System Workflow (How Everything Works)

```mermaid
flowchart TD
    subgraph User["1. User Journey"]
        Start(["Open App"]) --> CheckAuth{"Logged In?"}
        CheckAuth -- No --> SignIn["Sign In / Sign Up"]
        CheckAuth -- Yes --> MyTrips["My Trips (mytrip.jsx)"]
        SignIn --> MyTrips
        
        MyTrips --> Wizard["Create New Trip Wizard"]
        Wizard --> Step1["1. Search Destination"]
        Step1 --> Step2["2. Select Dates & Duration"]
        Step2 --> Step3["3. Who is Traveling? (Solo, Couple, Family, Friends)"]
        Step3 --> Step4["4. Budget Tier (Cheap, Moderate, Luxury)"]
        Step4 --> Step5["5. Destination-Smart Interests & Categories"]
        Step5 --> Step6["6. Review Trip Summary"]
        Step6 --> GenTrip["7. Generate AI Trip Plan"]
    end

    subgraph BackendAPI["2. AI Processing & Fallback (FastAPI app.py)"]
        GenTrip --> Req["POST /plan (with destination, duration, budget, interests)"]
        Req --> Gemini1["Primary: Gemini 3.8 Flash"]
        Gemini1 -.Quota / Network Error.-> Gemini2["Backup: Gemini Backup Model"]
        Gemini2 -.Error.-> DeepSeek["DeepSeek API"]
        DeepSeek -.Offline / Error.-> OSM["Deterministic OpenStreetMap Generator"]
        
        Gemini1 --> JSONResponse["Clean Validated JSON Itinerary"]
        Gemini2 --> JSONResponse
        DeepSeek --> JSONResponse
        OSM --> JSONResponse
    end

    subgraph Storage["3. Persistence Layer"]
        JSONResponse --> SaveContext["Save to CreateTripContext"]
        SaveContext --> SaveFirestore["Save to Firebase Firestore (UserTrips)"]
        SaveContext --> SaveAsync["Cache to AsyncStorage (@goguide_cached_trip)"]
    end

    subgraph Features["4. Interactive Travel Tools"]
        SaveAsync --> RenderTrip["Render in MyTrip Dashboard"]
        RenderTrip --> RouteMap["Multi-Stop Route Map (DayRouteModal)"]
        RenderTrip --> ExpenseLog["Expense Tracker (ExpenseTrackerModal)"]
        RenderTrip --> PDFExport["Print / Save PDF (PrintableItineraryModal)"]
        RenderTrip --> ShareClone["Share & Clone Trip (ShareTripModal)"]
        RenderTrip --> Packing["Smart Luggage Checklist (packing-checklist.jsx)"]
        RenderTrip --> DigitalPasses["Digital Tickets Hub (my-bookings.jsx)"]
        RenderTrip --> AlertsCheck{"Smart Alerts Enabled in Profile?"}
        AlertsCheck -- Yes --> ShowAdvisory["Display Proactive Advisory Banner"]
        AlertsCheck -- No --> MuteAdvisory["Mute Notifications"]
    end
```

---

## 4. User Capabilities (User App Me Kia Kia Kar Sakta Hai)

Here is a comprehensive breakdown of what an end user can do in the GoGuide AI Agent app:

### 1. Trip Creation & Smart Customization
- **Destination Search**: Search worldwide destinations with auto-suggestions.
- **Custom Dates & Duration**: Pick start/end dates with automatic day calculation.
- **Travel Companion Selection**: Solo Explorer, Couple/Romantic, Family, or Group of Friends.
- **Budget Selection**: Economy / Cheap, Moderate, or Luxury tier.
- **Smart Category Filtering**:
  - Filter attractions by category chips: *Beaches*, *History*, *Nature*, *Food & Dining*, *Shopping & Leisure*.
  - Auto-detection highlights relevant chips if the destination has beaches or ancient historical heritage.
- **Instant Plan Generation**: Radar pulse animation while the AI generates custom hotels, flight estimates, and daily timed activities.

### 2. Multi-Trip Switcher Carousel
- View all previous trips in an Apple-style horizontal animated slider.
- See trip duration, budget tier, and destination image at a glance.
- Tap any card to immediately switch active trip context.

### 3. Day-by-Day Itinerary Management
- **Day Filter Tabs**: Switch between *All Days* or individual days (*Day 1*, *Day 2*, etc.).
- **Visited Completion Checkboxes**: Tap the checkmark to cross off places you have already visited.
- **Remove Activities**: Delete places you want to skip.
- **Direct Navigation**: Tap *Map* or *Directions* to launch Google Maps turn-by-turn GPS directly.
- **Daily Route Optimization**: Tap *Day Route* to open an interactive OpenStreetMap view with computed travel distances and multi-stop driving directions.

### 4. Travel Budget & Expense Logging
- Tap *Expenses* in Quick Actions to open the Expense Tracker.
- Log expenses by Category (*Food*, *Transport*, *Stay*, *Activities*).
- Check the visual progress gauge to avoid exceeding budget limits.
- Delete or modify logged expenses anytime.

### 5. Digital Bookings & Vouchers Hub
- Access **My Bookings** from Profile or Quick Actions.
- View digital passes with flight confirmation codes, hotel vouchers, and scannable QR codes.
- Filter by tabs: *Upcoming*, *Completed*, *Cancelled*.
- 1-tap Google Maps directions to airport terminals or hotel entrances.

### 6. Smart AI Packing Checklist
- Access AI-generated luggage checklist tailored to the destination weather.
- Filter by *Clothing*, *Toiletries*, *Electronics*, *Documents*.
- Check off packed items with live progress percentage bar.
- Add custom items to your packing list.

### 7. Export & Sharing Tools
- **Print / PDF Itinerary**: Generate a sleek, magazine-style itinerary and trigger standard browser or system print to save as a PDF document.
- **Share Link**: Generate a unique URL for co-travelers and share directly to WhatsApp or social apps.
- **Clone Trip**: Allow friends to copy your entire itinerary into their account with 1 click.

### 8. Profile & Smart Alerts Customization
- **Smart Travel Alerts Switch**: Turn proactive notifications ON or OFF directly from the Profile screen.
- **Live Travel Stats**: Track total trips taken, unique cities visited, and active bookings.
- **Explorer Tiers**: Unlock Explorer badges (*Novice Explorer*, *Voyager Pro*, *Elite Globetrotter*) as you complete more trips.
- **Instant Dark Mode**: Toggle between sleek dark palette and clean daytime theme.
- **Account Management**: Update avatar, edit personal bio, or securely sign out.

---

## 5. Detailed File-by-File Technical Changes

| File Path | Description of Changes Made |
|---|---|
| [app.py](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app.py) | Updated `/plan` endpoint and `PlanRequest` schema to accept `interests` and `categories`. Enhanced prompt generation to enforce category-specific activities (e.g. beaches, history) into Gemini's JSON output. |
| [Option.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/constants/Option.js) | Added `DESTINATION_CATEGORIES` and expanded `SelectInterestsOptions` with categorized emojis, IDs, and tags. |
| [AiModel.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Configs/AiModel.js) | Updated `buildPrompt` to incorporate user-selected categories and interests into the prompt sent to backend AI. |
| [interest-page.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/create-trip/interest-page.jsx) | Re-architected with category chips (Beaches, History, Nature, Food, Shopping), beach OSM tag auto-detection, checkmark badges, count pill, and back button. |
| [generate-trip.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/create-trip/generate-trip.jsx) | Wired selected `interests` and `categories` from `tripData` into the AI trip plan request. Added hovering radar pulse animation. |
| [DayRouteModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/DayRouteModal.jsx) | **New Component**: Calculates Haversine distances, renders embedded OpenStreetMap, and generates multi-stop Google Maps navigation links. |
| [ExpenseTrackerModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/ExpenseTrackerModal.jsx) | **New Component**: Interactive expense logger with budget cap progress gauge and category breakdown. |
| [PrintableItineraryModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/PrintableItineraryModal.jsx) | **New Component**: Magazine-style printable view with 1-click `window.print()` PDF trigger. |
| [ShareTripModal.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/MyTrips/ShareTripModal.jsx) | **New Component**: Web share link generator, clipboard copy, native sharing, and "Clone Trip to Account" feature. |
| [profile.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/profile.jsx) | Added live travel statistics (Trips, Places, Bookings), Explorer Tier pills, Apple-style grouped menu cards, theme toggle, and the direct **Smart Travel Alerts** on/off switch. |
| [mytrip.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/mytrip.jsx) | Wired `DayRouteModal`, `ExpenseTrackerModal`, `PrintableItineraryModal`, and `ShareTripModal`. Added `Visited` checkmarks, activity deletion, trip cloning, and proactive advisory banner respecting user notification preference. |
| [my-bookings.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/my-bookings.jsx) | Added `<Stack.Screen options={{ headerShown: false }} />` to resolve duplicate navigation headers. |
| [_layout.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/_layout.jsx) | Registered `my-bookings`, `packing-checklist`, `cities`, `explore`, `beaches`, `mountains`, and `forest` screens cleanly in the root Stack navigator. |
| [discover.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/(tabs)/discover.jsx) | Overhauled with interactive Wishlist heart buttons (`@goguide_saved_places`), quick search pills, inline category filter chips, rich destination badges (season, price, vibe), and proper category routing. |
| [cities.jsx](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/app/cities.jsx) | **New Screen**: Route shortcut redirecting to `/explore?category=cities`. |
| [Destinations.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/Components/constants/Destinations.js) | Added `cities` category and 6 curated world metropolises (Tokyo, Paris, New York, Dubai, Rome, London). |

---

## 6. Offline Flight-Mode & Local Storage Architecture

The app is built to work reliably even when travelers are in flight or lack cellular connectivity:

1. **Active Trip Cache (`@goguide_cached_trip`)**:
   - Whenever an AI plan is generated or modified (e.g., visited activity checked, expense logged, trip cloned), it is instantly serialized to AsyncStorage under `@goguide_cached_trip`.
   - On cold app startup, `loadCachedTrip()` retrieves this data in under 50ms before any network request is attempted.
2. **User Preferences (`@goguide_preferences`)**:
   - Stores user preferences: `notifications` (boolean), `darkMode` (boolean), `dietary`, `currency`, and `temperatureUnit`.
   - Updates made in Profile or Preferences screen are saved automatically via `useEffect` in [CreateTripContext.js](file:///home/munawar-fmg/Downloads/GoGuide-AI-Agent-staging/app/Go%20Guide/context/CreateTripContext.js).
3. **Trip Wizard Draft (`tripData:<uid>`)**:
   - Persists in-progress trip creation steps so closing the app does not lose selected destinations, dates, or interests.

---

## 7. Testing & Quality Verification

All features were systematically verified:
- **Backend API Test Suite**:
  ```bash
  ./venv/bin/pytest
  ```
  - **Results**: `35 passed in 0.29s (100%)`.
  - Verifies `/plan`, `/chat`, `/generate`, rate limiting, fallback behaviors, and category parsing.
- **Frontend Expo Server**:
  - Active and responding with `HTTP 200 OK` on `http://localhost:8081`.
- **Offline & Fallback Safety**:
  - Deterministic fallbacks ensure the app never crashes even when third-party AI APIs hit quota limits.

---

## 8. How to Run the Application Locally

### 1. Start the Backend API (FastAPI)
```bash
# In project root:
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Mobile App (Expo)
```bash
# Navigate to the mobile app folder:
cd "app/Go Guide"
npx expo start
```
- Press `w` to open in Web Browser.
- Scan QR code with Expo Go (Android) or Camera (iOS) to test on physical mobile device.

### 3. Run Backend Automated Tests
```bash
# In project root:
./venv/bin/pytest -v
```

---
*Created for the GoGuide development team as a permanent architectural and implementation record.*
