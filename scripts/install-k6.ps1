# k6 설치 스크립트 (Windows PowerShell)
# 사용법: .\install-k6.ps1

Write-Host "=== k6 Installation Script for Windows ===" -ForegroundColor Green
Write-Host ""

# k6 버전
$K6_VERSION = "1.7.1"
$K6_URL = "https://github.com/grafana/k6/releases/download/v${K6_VERSION}/k6-v${K6_VERSION}-win-amd64.zip"
$DOWNLOAD_PATH = "$env:TEMP\k6.zip"
$EXTRACT_PATH = "$env:TEMP\k6"
$INSTALL_PATH = "C:\k6"

Write-Host "k6 버전: v${K6_VERSION}" -ForegroundColor Cyan
Write-Host "다운로드 URL: ${K6_URL}" -ForegroundColor Cyan
Write-Host ""

# 1. 다운로드
Write-Host "[1/4] k6 다운로드 중..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $K6_URL -OutFile $DOWNLOAD_PATH -UseBasicParsing
    Write-Host "✓ 다운로드 완료: ${DOWNLOAD_PATH}" -ForegroundColor Green
} catch {
    Write-Host "✗ 다운로드 실패: $_" -ForegroundColor Red
    exit 1
}

# 2. 압축 해제
Write-Host ""
Write-Host "[2/4] 압축 해제 중..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $DOWNLOAD_PATH -DestinationPath $EXTRACT_PATH -Force
    Write-Host "✓ 압축 해제 완료: ${EXTRACT_PATH}" -ForegroundColor Green
} catch {
    Write-Host "✗ 압축 해제 실패: $_" -ForegroundColor Red
    exit 1
}

# 3. 설치 디렉토리 생성
Write-Host ""
Write-Host "[3/4] 설치 디렉토리 생성 중..." -ForegroundColor Yellow
try {
    if (!(Test-Path $INSTALL_PATH)) {
        New-Item -ItemType Directory -Path $INSTALL_PATH -Force | Out-Null
    }
    # k6.exe 를 설치 디렉토리로 복사
    Copy-Item -Path "${EXTRACT_PATH}\k6-v${K6_VERSION}-win-amd64\k6.exe" -Destination "${INSTALL_PATH}\k6.exe" -Force
    Write-Host "✓ 설치 완료: ${INSTALL_PATH}\k6.exe" -ForegroundColor Green
} catch {
    Write-Host "✗ 설치 실패: $_" -ForegroundColor Red
    exit 1
}

# 4. PATH 추가
Write-Host ""
Write-Host "[4/4] PATH 환경 변수 설정 중..." -ForegroundColor Yellow

# 사용자 PATH 에 추가
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*${INSTALL_PATH}*") {
    $newPath = "${userPath};${INSTALL_PATH}"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✓ 사용자 PATH 에 추가됨" -ForegroundColor Green
} else {
    Write-Host "✓ 이미 PATH 에 포함되어 있음" -ForegroundColor Green
}

# 시스템 PATH 에 추가 (관리자 권한 필요)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    $systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($systemPath -notlike "*${INSTALL_PATH}*") {
        $newPath = "${systemPath};${INSTALL_PATH}"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Host "✓ 시스템 PATH 에 추가됨 (관리자 권한)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ 관리자 권한이 없어 시스템 PATH 에는 추가되지 않았습니다" -ForegroundColor Yellow
    Write-Host "  새 터미널을 열어 k6 명령어를 사용할 수 있습니다" -ForegroundColor Yellow
}

# 정리
Write-Host ""
Write-Host "정리 중..." -ForegroundColor Yellow
Remove-Item -Path $DOWNLOAD_PATH -Force -ErrorAction SilentlyContinue
Remove-Item -Path $EXTRACT_PATH -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ 임시 파일 정리 완료" -ForegroundColor Green

# 설치 확인
Write-Host ""
Write-Host "=== 설치 확인 ===" -ForegroundColor Green
Write-Host ""

# 새 프로세스에서 k6 version 확인 (PATH 반영 위해)
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "cmd.exe"
$processInfo.Arguments = "/c k6 version"
$processInfo.RedirectStandardOutput = $true
$processInfo.UseShellExecute = $false
$processInfo.EnvironmentVariables["Path"] = "${env:Path};${INSTALL_PATH}"

$process = [System.Diagnostics.Process]::Start($processInfo)
$output = $process.StandardOutput.ReadToEnd()
$process.WaitForExit()

if ($output -like "*k6*") {
    Write-Host "k6 버전: $output" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== 설치 성공! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 명령으로 테스트 실행:" -ForegroundColor Cyan
    Write-Host "  k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js" -ForegroundColor White
} else {
    Write-Host "⚠ k6 명령어를 찾을 수 없습니다." -ForegroundColor Yellow
    Write-Host "  새 PowerShell 창을 열어 다시 시도하거나," -ForegroundColor Yellow
    Write-Host "  수동으로 C:\k6 를 PATH 에 추가하세요." -ForegroundColor Yellow
}

Write-Host ""
