# eGov Enterprise E2E Test Automation & Orchestration Script
# 이 스크립트는 백그라운드에서 백엔드/프론트엔드를 기동하고 포트 헬스체크를 수행한 후 Playwright를 실행하고 자원을 반납합니다.

$LogFile = "d:\project\egov-enterprise\scratch\e2e-run-log.txt"
$ErrorActionPreference = "SilentlyContinue"

function Write-Log($Msg) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $FormattedMsg = "[$Timestamp] $Msg"
    Write-Output $FormattedMsg
    Add-Content -Path $LogFile -Value $FormattedMsg
}

# 1. 초기화 및 기존 좀비 정리
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
Write-Log "=========================================================="
Write-Log "🚀 E2E 자율 오케스트레이션 파이프라인 가동 개시"
Write-Log "=========================================================="

Write-Log "[1/5] 기존 좀비 프로세스 및 포트(8080, 3001) 강제 청소 중..."
$Port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($Port8080) {
    $Proc8080 = Get-Process -Id $Port8080.OwningProcess -ErrorAction SilentlyContinue
    if ($Proc8080) {
        Write-Log "-> 포트 8080 점유 프로세스 발견 (PID: $($Proc8080.Id)). 강제 종료합니다."
        Stop-Process -Id $Proc8080.Id -Force -ErrorAction SilentlyContinue
    }
}
$Port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($Port3001) {
    $Proc3001 = Get-Process -Id $Port3001.OwningProcess -ErrorAction SilentlyContinue
    if ($Proc3001) {
        Write-Log "-> 포트 3001 점유 프로세스 발견 (PID: $($Proc3001.Id)). 강제 종료합니다."
        Stop-Process -Id $Proc3001.Id -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# 2. 백그라운드 서버 기동
Write-Log "[2/5] 백엔드 및 프론트엔드 개발 서버를 백그라운드 프로세스로 기동합니다."
Write-Log "-> 백엔드 기동 시작 (api-server:bootRun)..."
$BackendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c gradlew.bat :api-server:bootRun -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Seoul" -WorkingDirectory "d:\project\egov-enterprise" -WindowStyle Hidden -PassThru

Write-Log "-> 프론트엔드 기동 시작 (pnpm dev)..."
$FrontendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm -C frontend dev" -WorkingDirectory "d:\project\egov-enterprise" -WindowStyle Hidden -PassThru

# 3. 헬스체크 감시 루프 (최대 180초)
Write-Log "[3/5] 서버 포트 활성화 감시 개시 (최대 3분 대기)..."
$MaxWait = 180
$Waited = 0
$BackendReady = $false
$FrontendReady = $false

while ($Waited -lt $MaxWait) {
    Start-Sleep -Seconds 10
    $Waited += 10
    
    # 백엔드 체크
    if (-not $BackendReady) {
        $Conn8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
        if ($Conn8080) {
            $BackendReady = $true
            Write-Log "-> [OK] 백엔드 API 서버 포트(8080) 활성화 감지!"
        }
    }
    
    # 프론트엔드 체크
    if (-not $FrontendReady) {
        $Conn3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
        if ($Conn3001) {
            $FrontendReady = $true
            Write-Log "-> [OK] 프론트엔드 웹 서버 포부(3001) 활성화 감지!"
        }
    }
    
    if ($BackendReady -and $FrontendReady) {
        break
    }
    
    Write-Log "-> 대기 중... (경과: ${Waited}초 / 상태 - BE: $BackendReady, FE: $FrontendReady)"
}

if (-not ($BackendReady -and $FrontendReady)) {
    Write-Log "❌ [ERROR] 3분 내에 백엔드 또는 프론트엔드 서버가 활성화되지 않았습니다. 강제 종료 처리합니다."
    # 셧다운 처리
    goto teardown
}

# 4. Playwright E2E 구동
Write-Log "[4/5] 모든 인프라 포트 준비 완료. Playwright E2E 테스트(Tier 1 Core)를 구동합니다."
Write-Log "-> npx playwright test e2e/01-core-base.spec.ts 실행 중..."

# 결과를 파일에 append하기 위해 cmd 파이프로 넘겨 직접 실행
$E2eCmd = "npx playwright test e2e/01-core-base.spec.ts"
cmd.exe /c "cd /d d:\project\egov-enterprise\frontend && $E2eCmd" >> $LogFile 2>&1

Write-Log "-> E2E 테스트 구동 시나리오 완료!"

# 5. 자원 회수 및 Teardown
:teardown
Write-Log "[5/5] 테스트 사이클이 완료되었습니다. 기동된 백그라운드 프로세스를 정리합니다."

# 포트 기반 강제 셧다운으로 안전 보증
$FinalBE = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($FinalBE) {
    Stop-Process -Id $FinalBE.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Log "-> 백엔드 프로세스 (PID: $($FinalBE.OwningProcess)) 강제 셧다운 완료."
}
$FinalFE = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($FinalFE) {
    Stop-Process -Id $FinalFE.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Log "-> 프론트엔드 프로세스 (PID: $($FinalFE.OwningProcess)) 강제 셧다운 완료."
}

# 윈도우 프로세스 목록 잔당 소탕
taskkill /F /IM node.exe /T > $null 2>&1
taskkill /F /IM java.exe /T > $null 2>&1

Write-Log "=========================================================="
Write-Log "🏁 E2E 자율 오케스트레이션 파이프라인 무인 종료"
Write-Log "=========================================================="
