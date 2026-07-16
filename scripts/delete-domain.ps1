# delete-domain.ps1
# Usage: ./delete-domain.ps1 -DomainName <domain_name> [-DryRun]
# Example: ./delete-domain.ps1 -DomainName "informalsanction"

param (
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [switch]$DryRun
)

$DomainName = $DomainName.ToLower()

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting safe deletion process for domain: $DomainName" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be actually deleted." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 백엔드 business-app 모듈 내 디렉터리 검색 및 삭제 대상 정의
$beTargets = @("business-app/src/main/java/nuri/business/domain/$DomainName", "business-app/src/main/java/nuri/business/service/$DomainName", "business-app/src/main/java/nuri/business/repository/$DomainName", "business-app/src/main/java/nuri/business/api/$DomainName", "business-app/src/test/java/nuri/business/service/$DomainName", "business-app/src/test/java/nuri/business/domain/$DomainName", "business-app/src/test/java/nuri/business/api/$DomainName")

# 2. 프론트엔드 내 디렉터리 및 파일 검색
$feTargets = @("frontend/src/app/admin/$DomainName", "frontend/src/services/$DomainName", "frontend/src/types/$DomainName")

# 3. 백엔드 api-server 내의 컨트롤러 디렉터리
$apiTargets = @("api-server/src/main/java/nuri/api/controller/business/$DomainName")

$allTargets = $beTargets + $feTargets + $apiTargets

$deletedCount = 0
$skippedCount = 0

foreach ($target in $allTargets) {
    if ($target -and (Test-Path $target)) {
        Write-Host "[FOUND] Target path exists: $target" -ForegroundColor Green
        if ($DryRun) {
            Write-Host "  [DRYRUN] Would delete: $target" -ForegroundColor Yellow
        } else {
            Write-Host "  [DELETE] Removing: $target" -ForegroundColor Red
            Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue
            $deletedCount++
        }
    } else {
        Write-Host "[SKIP] Target path not found: $target" -ForegroundColor DarkGray
        $skippedCount++
    }
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Deletion process finished." -ForegroundColor Cyan
Write-Host "Deleted paths: $deletedCount" -ForegroundColor Green
Write-Host "Skipped/Not found: $skippedCount" -ForegroundColor DarkGray
Write-Host "=============================================" -ForegroundColor Cyan
