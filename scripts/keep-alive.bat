@echo off
title GoGuide AI — 24/7 Render Keep-Alive (Windows)
color 0A

echo ========================================================
echo   GoGuide AI — 24/7 Render Backend Heartbeat Pinger
echo ========================================================
echo.
echo Target URL: https://goguide-ai-agent.onrender.com/
echo Pinging every 10 minutes to prevent server sleep...
echo Press Ctrl + C to stop at any time.
echo.

:loop
echo [%date% %time%] Sending keep-alive ping to Render...
powershell -Command "try { $res = Invoke-WebRequest -Uri 'https://goguide-ai-agent.onrender.com/' -UseBasicParsing -TimeoutSec 30; Write-Host ('[SUCCESS] Response code: ' + $res.StatusCode) -ForegroundColor Green } catch { Write-Host ('[WARNING] Request status: ' + $_.Exception.Message) -ForegroundColor Yellow }"
echo [%date% %time%] Sleeping for 10 minutes (600 seconds)...
echo --------------------------------------------------------
timeout /t 600 /nobreak >nul
goto loop
