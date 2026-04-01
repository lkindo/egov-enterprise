# k6 부하 테스트 실행 스크립트
# 사용법: .\run-load-test.ps1 -LoadLevel 100

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet(100, 500, 1000)]
    [int]$LoadLevel = 100,
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:8080",
    
    [Parameter(Mandatory=$false)]
    [string]$TestUsername = "testuser",
    
    [Parameter(Mandatory=$false)]
    [string]$TestPassword = "testpass123!"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$k6Path = "C:\k6\k6.exe"
$scenario = "users-$LoadLevel"
$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  k6 Load Test - $LoadLevel Users" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# k6 경로 확인
if (!(Test-Path $k6Path)) {
    Write-Host "Error: k6 not found at $k6Path" -ForegroundColor Red
    Write-Host "Please install k6 first." -ForegroundColor Yellow
    exit 1
}

# 서버 상태 확인
Write-Host "[1/4] Checking backend server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/actuator/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend server is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend server returned status: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Backend server is not responding at $BaseUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the backend server first:" -ForegroundColor Yellow
    Write-Host "  ./gradlew.bat :api-server:bootRun --args='--spring.profiles.active=test'" -ForegroundColor White
    exit 1
}

# 결과 디렉토리 생성
Write-Host ""
Write-Host "[2/4] Creating results directory..." -ForegroundColor Yellow
$resultsDir = Join-Path $projectRoot "test-results\k6"
$reportDir = Join-Path $projectRoot "test\load-tests\results"
if (!(Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
}
if (!(Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}
Write-Host "✓ Results directories ready" -ForegroundColor Green

# k6 테스트 실행
Write-Host ""
Write-Host "[3/4] Running k6 load test..." -ForegroundColor Yellow
Write-Host "  Scenario: $scenario" -ForegroundColor Cyan
Write-Host "  Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "  Load Level: $LoadLevel users" -ForegroundColor Cyan
Write-Host ""

$env:BASE_URL = $BaseUrl
$env:TEST_USERNAME = $TestUsername
$env:TEST_PASSWORD = $TestPassword

$k6Script = Join-Path $projectRoot "test\load-tests\scenarios\load-levels.js"
$jsonOutput = Join-Path $resultsDir "results-$LoadLevel-$timestamp.json"

& $k6Path run `
    --out json=$jsonOutput `
    --tag load_level=$LoadLevel `
    --tag git_sha=local `
    --tag git_ref=local `
    --scenario $scenario `
    $k6Script

$exitCode = $LASTEXITCODE

# 결과 확인
Write-Host ""
Write-Host "[4/4] Test completed" -ForegroundColor Yellow
if ($exitCode -eq 0) {
    Write-Host "✓ Load test completed successfully!" -ForegroundColor Green
    
    # HTML 리포트 확인
    $htmlReports = Get-ChildItem -Path $reportDir -Filter "report-*.html" | Sort-Object LastWriteTime -Descending
    if ($htmlReports.Count -gt 0) {
        $latestReport = $htmlReports[0]
        Write-Host ""
        Write-Host "HTML Report generated:" -ForegroundColor Cyan
        Write-Host "  $($latestReport.FullName)" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening report in browser..." -ForegroundColor Yellow
        Invoke-Item $latestReport.FullName
    }
} else {
    Write-Host "✗ Load test failed with exit code: $exitCode" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Load Level: $LoadLevel users"
Write-Host "  Timestamp:  $timestamp"
Write-Host "  Exit Code:  $exitCode"
Write-Host "  JSON Results: $jsonOutput"
Write-Host "========================================" -ForegroundColor Cyan

exit $exitCode
