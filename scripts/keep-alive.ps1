# GoGuide AI — 24/7 Render Keep-Alive Script (Windows PowerShell)
$BackendUrl = "https://goguide-ai-agent.onrender.com/"
$IntervalMinutes = 10

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  GoGuide AI — 24/7 Render Backend Heartbeat (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Target: $BackendUrl" -ForegroundColor Yellow
Write-Host "Pinging every $IntervalMinutes minutes..." -ForegroundColor Yellow
Write-Host "Press Ctrl + C to stop.`n"

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Pinging Render backend..." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $BackendUrl -UseBasicParsing -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host " [OK 200] Server is active and awake!" -ForegroundColor Green
        } else {
            Write-Host " [Status: $($response.StatusCode)]" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " [Ping sent, waiting for wake up: $($_.Exception.Message)]" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
