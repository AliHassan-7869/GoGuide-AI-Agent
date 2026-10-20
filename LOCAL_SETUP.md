# Local Setup (Linux and Windows)

How to run the GoGuide backend and open the app in Expo Go on your phone.

---

## 1. Requirements

| Tool | Version |
|---|---|
| Python | 3.11 or newer |
| Node.js | 20 or newer |
| Expo Go app | Latest, on your Android phone |

Phone and computer must be on the **same WiFi**. Mobile data on the phone will not work.

---

## 2. Backend

### First time

**Linux**

```bash
cd GoGuide-AI-Agent-staging
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
cd GoGuide-AI-Agent-staging
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

Create `.env` in the project root:

```
GEMINI_API_KEY=your-gemini-key
API_KEY=any-long-random-string
# DEEPSEEK_API_KEY=optional
```

### Run

**Linux**

```bash
./venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

**Windows (PowerShell)**

```powershell
.\venv\Scripts\uvicorn app:app --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is required. Without it the phone cannot reach the backend.

---

## 3. Mobile app

### First time

```bash
cd "app/Go Guide"
npm install
```

The app finds the backend by itself. It uses the same computer address that Expo Go connected to, on port 8000. You do **not** need to put your IP in `.env` for local use.

### Run

```bash
cd "app/Go Guide"
npm start
```

Scan the QR code with Expo Go. Then sign in. AI features need a signed in user.

No Expo account is needed. The project is not linked to an EAS project, so Expo never asks you to log in.

**iPhone:** since September 2026, Expo Go on a real iPhone only opens dev projects when you are logged in to the same Expo account on both Expo CLI (`npx expo login`) and Expo Go. Android, emulators and the web do not need an account. If you are logged in: scan the QR with the **Camera** app, tap "Open in Expo Go", and allow Settings > Privacy & Security > Local Network > **Expo Go**.

### Test without an Expo account

| Way | Command | Notes |
|---|---|---|
| Browser (any phone or computer) | `npm run web` | Open `http://<computer-ip>:8081` in Safari or Chrome on the same WiFi. Some native features (haptics, calendar) behave differently |
| Android phone | `npm start`, scan with Expo Go | No login needed on Android |
| Android emulator | `npm start`, then press `a` | Needs Android Studio and an emulator. Expo Go installs itself |

**Expo Go version:** the store Expo Go only opens one SDK. This app uses SDK 57. If Expo Go says the project is incompatible, update Expo Go or upgrade the app SDK to match.

The console shows `[Backend] Using http://<your-ip>:8000` so you can see which address the app picked.

---

## 4. Allow the phone through the firewall

If Expo Go shows **request timed out**, the firewall is blocking the phone. Open ports **8081** (Expo) and **8000** (backend) for your local network only.

### Linux (ufw)

Find your network range first (for `192.168.1.28` it is `192.168.1.0/24`):

```bash
ip -4 -br addr
```

Then:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8081 proto tcp comment 'Expo Metro'
sudo ufw allow from 192.168.1.0/24 to any port 8000 proto tcp comment 'GoGuide backend'
sudo ufw status numbered
```

Remove a rule later with `sudo ufw delete <number>`.

### Windows

1. Make sure your WiFi is set to **Private**, not Public:
   Settings > Network & internet > Wi-Fi > your network > Network profile type > **Private**.
2. Open **PowerShell as Administrator** and run:

```powershell
New-NetFirewallRule -DisplayName "Expo Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "GoGuide backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
```

3. If Windows shows a popup for Node.js or Python, tick **Private networks** and click Allow.

Remove the rules later:

```powershell
Remove-NetFirewallRule -DisplayName "Expo Metro"
Remove-NetFirewallRule -DisplayName "GoGuide backend"
```

### Test from the phone

Open these in the phone browser:

| URL | Expected |
|---|---|
| `http://<computer-ip>:8081/status` | `packager-status:running` |
| `http://<computer-ip>:8000/health` | `{"status":"ok"}` |

Find the computer IP with `ip -4 -br addr` (Linux) or `ipconfig` (Windows, look for "IPv4 Address" under Wi-Fi).

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| Terminal asks "log in with your Expo account" | `app.json` has an `extra.eas.projectId` (or `owner`) from another account. Remove them, or log in to the account that owns that EAS project |
| Request timed out after scanning QR | Firewall. See section 4 |
| Both URLs above fail from the phone | Router has "AP isolation" / "client isolation" on. Turn it off, or connect the computer to the phone hotspot |
| QR code shows a wrong IP (like `172.x.x.x` from Docker or a VPN) | Linux: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.28 npm start`. Windows PowerShell: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.28"; npm start` |
| Nothing works on WiFi | `npm run start:tunnel` opens the app over the internet. AI features still need the backend reachable, so set `EXPO_PUBLIC_API_URL` to a deployed backend |
| AI says "Please sign in" | Sign in inside the app first |
| AI says "AI service error" | Check the backend terminal. Usually Gemini quota (`429`) or DeepSeek balance (`402`) |
| `[Backend] Using` shows the wrong address | Set `EXPO_PUBLIC_API_URL=http://<computer-ip>:8000` in `app/Go Guide/.env` and restart with `npx expo start -c` |

---

## 6. Production

For a release build, set the deployed backend in `app/Go Guide/.env` (or EAS env):

```
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
```

Release builds on Android block plain `http://`, so production must use `https://`.
