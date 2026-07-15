# run-e2e-pipeline.ps1
# EGOV Enterprise CI/CD & Local Integrated E2E Validation Pipeline

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Integrated E2E Validation Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Clean up existing processes on ports 8080 and 3001 to prevent port collisions (Teardown)
Write-Host "🧹 Cleaning up existing zombie processes on ports 8080 and 3001..." -ForegroundColor Yellow
try {
    $backendPid = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($backendPid) {
        Write-Host "Stopping process $backendPid on port 8080"
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    $frontendPid = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($frontendPid) {
        Write-Host "Stopping process $frontendPid on port 3001"
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "No active processes found on target ports (safe to proceed)." -ForegroundColor Gray
}

# 2. Boot Backend API Server in background (activating 'e2e' profile for external OCI DB connection)
Write-Host "📡 Starting Spring Boot Backend (:api-server) via bootRun with e2e profile..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "./gradlew :api-server:bootRun --args='--spring.profiles.active=e2e'" -PassThru -NoNewWindow

# 3. Wait for Backend Health Check
Write-Host "⏳ Waiting for backend (localhost:8080) to boot and run Flyway migrations..." -ForegroundColor Yellow
$timeout = 180 # 3 minutes timeout
$elapsed = 0
$backendReady = $false

while ($elapsed -lt $timeout) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Keep waiting for backend boot
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if (-not $backendReady) {
    Write-Host "❌ Timeout: Backend server failed to start within $timeout seconds." -ForegroundColor Red
    if ($backendProcess) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

Write-Host "✅ Backend is ready (status: 200 OK)." -ForegroundColor Green

# 4. Clean up DB garbage data before starting E2E tests
Write-Host "🧹 Running Database Cleanup before E2E execution..." -ForegroundColor Yellow
try {
    Set-Location -Path "frontend"
    npm run test:cleanup
} catch {
    Write-Host "⚠️ Warning: Database cleanup task failed. Proceeding anyway." -ForegroundColor DarkYellow
} finally {
    Set-Location -Path ".."
}

# 5. Boot Frontend Dev Server (next dev) in background
Write-Host "📡 Starting Frontend Dev Server (next dev) on port 3001..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "Set-Location -Path frontend; npm run dev -- -p 3001" -PassThru -NoNewWindow

# 6. Wait for Frontend to be ready
Write-Host "⏳ Waiting for frontend (localhost:3001) to respond..." -ForegroundColor Yellow
$feTimeout = 120
$feElapsed = 0
$frontendReady = $false

while ($feElapsed -lt $feTimeout) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/login" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {
        # Keep waiting
    }
    Start-Sleep -Seconds 2
    $feElapsed += 2
}

if (-not $frontendReady) {
    Write-Host "❌ Timeout: Frontend server failed to start within $feTimeout seconds." -ForegroundColor Red
    if ($backendProcess) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendProcess) { Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

Write-Host "✅ Frontend is ready (status: 200 OK)." -ForegroundColor Green

# 7. Execute Playwright E2E tests
Write-Host "🚀 Launching Playwright E2E Test Suite..." -ForegroundColor Yellow
$testExitCode = 0

try {
    Set-Location -Path "frontend"
    npx playwright test
    $testExitCode = $LASTEXITCODE
} catch {
    Write-Host "❌ E2E Execution encountered an error: $_" -ForegroundColor Red
    $testExitCode = 1
} finally {
    Set-Location -Path ".."
}

# 8. Clean up DB garbage data after E2E tests
Write-Host "🧹 Running Database Cleanup after E2E execution..." -ForegroundColor Yellow
try {
    Set-Location -Path "frontend"
    npm run test:cleanup
} catch {
    Write-Host "⚠️ Warning: Database cleanup task failed." -ForegroundColor DarkYellow
} finally {
    Set-Location -Path ".."
}

# 9. Teardown background processes
Write-Host "🛑 Shutting down Spring Boot Backend and Next.js Frontend processes..." -ForegroundColor Yellow
if ($backendProcess) {
    try { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
}
if ($frontendProcess) {
    try { Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
}

# Clean up java and node remaining processes on target ports for safety
try {
    $remainingBackendPid = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($remainingBackendPid) {
        Stop-Process -Id $remainingBackendPid -Force -ErrorAction SilentlyContinue
    }
} catch {}

try {
    $remainingFrontendPid = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($remainingFrontendPid) {
        Stop-Process -Id $remainingFrontendPid -Force -ErrorAction SilentlyContinue
    }
} catch {}

Write-Host "==========================================================" -ForegroundColor Cyan
if ($testExitCode -eq 0) {
    Write-Host "🎉 Integrated E2E Pipeline Completed Successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Integrated E2E Pipeline Failed (Exit Code: $testExitCode)" -ForegroundColor Red
}
Write-Host "==========================================================" -ForegroundColor Cyan

exit $testExitCode
