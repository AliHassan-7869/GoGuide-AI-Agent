# Machine Extensions, Tools & Project Dependencies Inventory

> **Snapshot Date:** 2026-11-27  
> **OS:** Linux (x64)  
> **Project:** GoGuide AI Agent (`GoGuide-AI-Agent-staging`)

Use this reference to track or quickly recreate your development environment on another machine.

---

## 1. Core System Runtimes & CLIs

| Tool | Installed Version |
|---|---|
| **Node.js** | `v24.21.0` (via NVM) |
| **npm** | `11.19.0` |
| **Python** | `3.12.3` |
| **Git** | `2.43.0` |
| **EAS CLI** | `27.5.0` |

---

## 2. Global npm Packages

| Package | Version | Purpose |
|---|---|---|
| `@expo/ngrok` | `4.1.3` | Expo Go `--tunnel` networking |
| `corepack` | `0.36.0` | Node package manager shim |
| `eas-cli` | `27.5.0` | Expo Application Services (APK/AAB builds & OTA updates) |
| `npm` | `11.19.0` | Node package manager |
| `omniroute` | `3.8.50` | Local API router |
| `pnpm` | `11.28.5` | Fast Node package manager |
| `vercel` | `65.4.0` | Vercel CLI deployments |

**Quick Reinstall:**
```bash
npm install -g eas-cli vercel pnpm @expo/ngrok omniroute
```

---

## 3. Installed VS Code Extensions (32 Total)

| Extension ID | Version | Category |
|---|---|---|
| `anthropic.claude-code` | `2.1.332` | AI Coding Assistant |
| `dbaeumer.vscode-eslint` | `3.0.34` | JS/TS Linting |
| `esbenp.prettier-vscode` | `12.4.0` | Code Formatting |
| `rvest.vs-code-prettier-eslint` | `6.0.0` | Prettier + ESLint Integration |
| `dsznajder.es7-react-js-snippets` | `4.4.3` | React / React Native Snippets |
| `lauren.react-pack` | `1.0.0` | React Extension Pack |
| `bradgashler.htmltagwrap` | `1.0.0` | HTML/JSX Tag Wrapping |
| `eamodio.gitlens` | `19.7.0` | Git History & Blame |
| `donjayamanne.githistory` | `0.6.20` | Git Log Viewer |
| `github.vscode-github-actions` | `0.32.3` | GitHub Actions Workflows |
| `hbenl.vscode-test-explorer` | `2.22.1` | Test Explorer UI |
| `kavod-io.vscode-jest-test-adapter` | `0.8.1` | Jest Test Runner |
| `ms-vscode.test-adapter-converter` | `0.2.1` | Test Adapter Bridge |
| `ms-python.python` | `2026.10.0` | Python Language Support |
| `ms-python.vscode-pylance` | `2026.4.1` | Python IntelliSense |
| `ms-python.debugpy` | `2026.6.0` | Python Debugger |
| `ms-toolsai.datawrangler` | `1.24.3` | Data Frame Inspection |
| `ms-toolsai.jupyter` | `2025.9.1` | Jupyter Notebooks |
| `ms-toolsai.jupyter-keymap` | `1.1.2` | Jupyter Keybindings |
| `ms-toolsai.jupyter-renderers` | `1.3.0` | Jupyter Output Renderers |
| `ms-toolsai.vscode-jupyter-cell-tags` | `0.1.9` | Jupyter Cell Tags |
| `ms-toolsai.vscode-jupyter-slideshow` | `0.1.6` | Jupyter Slideshow |
| `ms-azuretools.vscode-containers` | `2.5.3` | Docker / Containers |
| `ms-vscode-remote.remote-containers` | `0.481.0` | Dev Containers |
| `ms-vscode.makefile-tools` | `0.12.17` | Makefile Support |
| `mcright.auto-save` | `1.0.3` | Auto Save |
| `mechatroner.rainbow-csv` | `3.24.1` | CSV Highlighting |
| `moshfeu.compare-folders` | `0.30.0` | Folder Diff |
| `ritwickdey.liveserver` | `5.7.10` | Local Static Live Server |
| `xdebug.php-debug` | `1.40.2` | PHP Debugging |
| `xdebug.php-pack` | `1.0.3` | PHP Extension Pack |
| `zobo.php-intellisense` | `1.3.3` | PHP IntelliSense |

**Quick Reinstall All Extensions on a New PC:**
```bash
for ext in \
  anthropic.claude-code bradgashler.htmltagwrap dbaeumer.vscode-eslint \
  donjayamanne.githistory dsznajder.es7-react-js-snippets eamodio.gitlens \
  esbenp.prettier-vscode github.vscode-github-actions hbenl.vscode-test-explorer \
  kavod-io.vscode-jest-test-adapter lauren.react-pack mcright.auto-save \
  mechatroner.rainbow-csv moshfeu.compare-folders ms-azuretools.vscode-containers \
  ms-python.debugpy ms-python.python ms-python.vscode-pylance \
  ms-toolsai.datawrangler ms-toolsai.jupyter ms-toolsai.jupyter-keymap \
  ms-toolsai.jupyter-renderers ms-toolsai.vscode-jupyter-cell-tags \
  ms-toolsai.vscode-jupyter-slideshow ms-vscode-remote.remote-containers \
  ms-vscode.makefile-tools ms-vscode.test-adapter-converter ritwickdey.liveserver \
  rvest.vs-code-prettier-eslint xdebug.php-debug xdebug.php-pack zobo.php-intellisense
do
  code --install-extension "$ext"
done
```

---

## 4. GoGuide Frontend Dependencies (`app/GoGuide/package.json`)

### Production Dependencies (45)

| Package | Version |
|---|---|
| `@expo/vector-icons` | `^15.0.3` |
| `@google/generative-ai` | `^0.24.1` |
| `@noble/ciphers` | `^1.3.0` |
| `@react-native-async-storage/async-storage` | `2.2.0` |
| `@react-navigation/bottom-tabs` | `^7.4.0` |
| `@react-navigation/elements` | `^2.6.3` |
| `@react-navigation/native` | `^7.1.8` |
| `date-fns` | `^2.30.0` |
| `expo` | `^58.0.22` |
| `expo-build-properties` | `~58.0.12` |
| `expo-clipboard` | `~58.0.4` |
| `expo-constants` | `~58.0.14` |
| `expo-crypto` | `~58.0.8` |
| `expo-file-system` | `~58.0.13` |
| `expo-font` | `~58.0.11` |
| `expo-haptics` | `~58.0.7` |
| `expo-image` | `~58.0.18` |
| `expo-image-picker` | `~58.0.10` |
| `expo-linear-gradient` | `~58.0.3` |
| `expo-linking` | `~58.0.15` |
| `expo-location` | `~58.0.20` |
| `expo-print` | `^58.0.8` |
| `expo-router` | `~58.0.29` |
| `expo-secure-store` | `~58.0.3` |
| `expo-sharing` | `^58.0.22` |
| `expo-splash-screen` | `~58.0.12` |
| `expo-status-bar` | `~58.0.4` |
| `expo-symbols` | `~58.0.4` |
| `expo-system-ui` | `~58.0.7` |
| `expo-updates` | `~58.0.23` |
| `expo-web-browser` | `~58.0.7` |
| `firebase` | `^12.6.0` |
| `jspdf` | `^4.2.1` |
| `moment` | `^2.30.1` |
| `react` | `19.3.0` |
| `react-dom` | `19.3.0` |
| `react-native` | `0.88.1` |
| `react-native-gesture-handler` | `~3.3.0` |
| `react-native-google-places-autocomplete` | `^2.6.4` |
| `react-native-reanimated` | `4.7.1` |
| `react-native-safe-area-context` | `~5.10.1` |
| `react-native-screens` | `~4.30.1` |
| `react-native-svg` | `15.16.0` |
| `react-native-web` | `^0.21.4` |
| `react-native-worklets` | `0.13.0` |

### Dev Dependencies (13)

| Package | Version |
|---|---|
| `@react-native/jest-preset` | `^0.88.1` |
| `@testing-library/react-native` | `^14.1.0` |
| `@types/react` | `~19.3.0` |
| `babel-plugin-module-resolver` | `^5.0.2` |
| `babel-plugin-transform-remove-console` | `^6.9.4` |
| `eslint` | `^9.25.0` |
| `eslint-config-expo` | `~58.0.4` |
| `jest` | `~30.5.2` |
| `jest-expo` | `~58.0.14` |
| `playwright-core` | `1.65.1` |
| `react-test-renderer` | `19.3.0` |
| `ts-node` | `^10.9.2` |
| `typescript` | `~6.0.3` |

---

## 5. GoGuide Python Backend Dependencies

### Production Render Requirements (`requirements-render.txt`)
- `pyyaml>=6.0.2`
- `fastapi>=0.110.0`
- `uvicorn>=0.28.0`
- `requests>=2.31.0`
- `pydantic>=2.0.0`
- `google-auth>=2.28.0`
- `python-dotenv>=1.0.0`
- `langgraph>=0.2.0`
- `langchain-core>=0.3.0`
- `sentry-sdk[fastapi]>=2.0.0`

### Key Installed Packages in Local `venv/` (Python 3.12.3)

| Package | Version |
|---|---|
| `fastapi` | `0.150.0` |
| `uvicorn` | `0.54.0` |
| `pydantic` | `2.12.5` |
| `google-auth` | `2.62.0` |
| `google-genai` | `1.65.0` |
| `langgraph` | `1.2.16` |
| `langchain` | `1.4.6` |
| `langchain-core` | `1.6.12` |
| `crewai` | `1.15.28` |
| `crewai-tools` | `1.15.28` |
| `litellm` | `1.106.0` |
| `openai` | `2.54.0` |
| `chromadb` | `1.5.9` |
| `lancedb` | `0.30.0` |
| `duckduckgo_search` | `8.1.1` |
| `sentry-sdk` | `2.74.0` |
| `streamlit` | `1.66.0` |
| `pytest` | `9.1.1` |
| `requests` | `2.34.2` |
| `httpx` | `0.28.1` |
| `python-dotenv` | `1.2.4` |
| `PyYAML` | `6.0.3` |
| `PyJWT` | `2.15.1` |
| `cryptography` | `50.0.2` |
| `json_repair` | `0.60.1` |
| `mcp` | `1.28.1` |
| `pandas` | `3.0.6` |
| `numpy` | `2.5.4` |
| `pdfplumber` | `0.11.10` |
| `PyMuPDF` | `1.26.7` |
| `pillow` | `12.3.0` |

**Quick Reinstall Python Backend:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-render.txt
```

