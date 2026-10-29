# delete-domain.ps1 — 기능 파일(매니페스트 v2) 기반 app 도메인 소스 삭제
#
# Usage:   ./scripts/delete-domain.ps1 -DomainName <name>[,<name>...] [-DryRun]
# Example: ./scripts/delete-domain.ps1 -DomainName "informalsanction" -DryRun
#
# 도메인의 SSOT 는 config/modules 의 기능 파일(<기능 id>.json)이다(11단계 C5 — 종전 v1 manifest).
#  - 기능 파일이 없는 도메인명은 즉시 에러로 중단한다(경로 추측·침묵 SKIP 금지). 판정은 scripts/domain-deletion-plan.mjs 가 한다.
#  - 지우는 도메인을 요구하는 도메인은 자동으로 동반 삭제한다. 판정은 생성기와 같은 간선 규칙(코드 참조·지원 파일·
#    생성 묶음 선언)을 지금 트리에서 계산해 거꾸로 따라가는 scripts/domain-deletion-plan.mjs 가 한다. 카탈로그 전체를
#    적재하지 않으므로 생성물·이미 지운 트리·새 도메인을 스캐폴드한 트리에서도 돈다.
#    지우는 도메인이 요구하는 도메인은 남긴다.
#  - 백엔드 경로는 생성기 Java 단계(reusable-source-java.mjs 의 resolveDomainRemovalDirectory)와 같은 canonical layout
#    (business-app/src/{main,test}/java/nuri/business/{domain,service}/<d>)과, 그 밖에서 함께 지울 파일이다.
#    그 밖의 파일(지원 파일, 지우는 타입을 참조하는 api-server 컨트롤러·시험)은 디렉터리 이름으로 추측하지 않고
#    생성기 Java 투영(planJavaRemoval)으로 고른 plan.javaFiles 를 쓴다. 컨트롤러는 기능 이름과 다른 패키지에 있을 수 있다
#    (행사·외부인사·포상 컨트롤러는 controller/business/operation).
#  - frontend 경로는 지우는 기능의 화면 소유(owns.frontend)와, 소유한 기능을 모두 지울 때의 함께 소유한 화면(owns.frontendAny)이다
#    (plan.frontendPaths). 생성기 투영의 화면 제외 규칙과 같다.
#  - 삭제 후 남는 tb_menu_info 시드 라우트(versioned migration)는 경고로 출력한다.
#
# 이 스크립트는 경로 삭제만 담당한다. 전이 참조 정리·기능 마커(reusable-base:<기능 id>) 블록 제거까지 필요한
# 경우는 재사용 base projection(npm run base:generate-source)을 사용한다.

param (
    [Parameter(Mandatory = $true)]
    [string[]]$DomainName,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ModulesRelPath = 'config/modules'

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Domain deletion (feature-module-driven)" -ForegroundColor Cyan
Write-Host "  Modules: $ModulesRelPath" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be actually deleted." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 입력 정리 ------------------------------------------------------------------
$requested = @(
    $DomainName |
        ForEach-Object { $_.ToLower().Trim() } |
        Where-Object { $_ } |
        Select-Object -Unique
)

# 2. 동반 삭제 (requires 간선의 역방향 폐포, scripts/domain-deletion-plan.mjs) -----------
#    기능 파일이 없는 도메인은 판정이 에러로 멈춘다(알려진 기능 목록을 함께 적는다).
#    지우는 도메인을 요구하는 도메인을 함께 지운다. 화면을 같이 쓰는 데서 나온 간선은 보지 않는다.
$planScript = Join-Path $RepoRoot 'scripts/domain-deletion-plan.mjs'
$planOutput = & node $planScript --json @requested
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 동반 삭제 판정 실패(scripts/domain-deletion-plan.mjs, exit $LASTEXITCODE) — 위 메시지를 보라. 기능은 $ModulesRelPath 의 기능 파일이다." -ForegroundColor Red
    exit 1
}
$plan = ($planOutput -join "`n") | ConvertFrom-Json
$kindLabels = @{ java = '코드 참조'; manifest = '생성 묶음 선언' }
foreach ($row in @($plan.added)) {
    $kinds = @($row.because.kinds | ForEach-Object { if ($kindLabels.ContainsKey($_)) { $kindLabels[$_] } else { $_ } }) -join ' · '
    Write-Host "[REQUIRES] 동반 삭제 추가: $($row.domain) — $($row.because.to) 를 요구한다($kinds)" -ForegroundColor Yellow
    if ($row.because.userReason) { Write-Host "          사유: $($row.because.userReason)" -ForegroundColor DarkYellow }
}
$toDelete = [System.Collections.Generic.HashSet[string]]::new([string[]]@($plan.domains))
$deleteList = @($toDelete) | Sort-Object
Write-Host "삭제 대상 도메인: $($deleteList -join ', ')" -ForegroundColor Cyan

# 3. 백엔드 경로 도출 (generator canonical layout + 생성기 Java 투영이 함께 지우는 파일) --------
$backendRelPaths = @()
foreach ($d in $deleteList) {
    foreach ($sourceSet in 'main', 'test') {
        foreach ($layer in 'domain', 'service') {
            $backendRelPaths += "business-app/src/$sourceSet/java/nuri/business/$layer/$d"
        }
    }
}
foreach ($row in @($plan.javaFiles)) {
    Write-Host "[CASCADE] 함께 삭제: $($row.file) — $($row.reason)" -ForegroundColor Yellow
    $backendRelPaths += $row.file
}

# 4. frontend 경로: 지우는 기능의 화면 소유(plan.frontendPaths) ---------------------
$frontendRelPaths = @($plan.frontendPaths | Where-Object { $_ })

# 지우는 Java 타입의 정규화된 이름 (6단계 잔존 참조 검사용) — 지우기 전에 읽는다 ------
#    기능 이름(system 등)을 패키지 접두로 찾으면 business-core 의 같은 이름 패키지까지 걸린다. 실제로 지우는 타입만 찾는다.
$deletedTypeNames = [System.Collections.Generic.HashSet[string]]::new()
$deletedPackages = [System.Collections.Generic.HashSet[string]]::new()
foreach ($rel in $backendRelPaths) {
    $full = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $rel))
    if (-not (Test-Path $full)) { continue }
    foreach ($file in (Get-ChildItem -Path $full -Recurse -File -Filter '*.java')) {
        $packageLine = Select-String -Path $file.FullName -Pattern '^\s*package\s+([A-Za-z_][\w.]*)\s*;' | Select-Object -First 1
        if (-not $packageLine) { continue }
        $package = $packageLine.Matches[0].Groups[1].Value
        [void]$deletedPackages.Add($package)
        [void]$deletedTypeNames.Add("$package.$($file.BaseName)")
    }
}

# 5. 삭제 실행 (또는 DryRun 보고) ----------------------------------------------
$allRelPaths = $backendRelPaths + $frontendRelPaths
$deletedRelPaths = @()
$absentRelPaths = @()
foreach ($rel in $allRelPaths) {
    $full = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $rel))
    if (Test-Path $full) {
        if ($DryRun) {
            Write-Host "  [DRYRUN] Would delete: $rel" -ForegroundColor Yellow
        } else {
            Write-Host "  [DELETE] Removing: $rel" -ForegroundColor Red
            Remove-Item -Path $full -Recurse -Force
        }
        $deletedRelPaths += $rel
    } else {
        $absentRelPaths += $rel
    }
}
if ($absentRelPaths.Count -gt 0) {
    Write-Host "[INFO] 기능 소유 경로 중 현재 트리에 없는 경로($($absentRelPaths.Count)건) — 해당 도메인이 그 계층을 갖지 않는 정상 케이스다:" -ForegroundColor DarkGray
    foreach ($rel in $absentRelPaths) { Write-Host "    - $rel" -ForegroundColor DarkGray }
}

# 6. 잔존 Java 참조 sweep (지우는 타입을 참조하는 남은 소스 경고) -----------------
#    정규화된 타입 이름(import·정적 import·코드 안 FQN)과 지우는 패키지의 와일드카드 import 를 찾는다. 빌드 산출물(build/)은 보지 않는다.
$refPatterns = @($deletedTypeNames | Sort-Object | ForEach-Object { [regex]::Escape($_) + '(?![A-Za-z0-9_$])' }) +
    @($deletedPackages | Sort-Object | ForEach-Object { [regex]::Escape($_) + '\.\*' })
$deletedFullPaths = @($deletedRelPaths | ForEach-Object { [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $_)) })
$buildSegment = [System.IO.Path]::DirectorySeparatorChar + 'build' + [System.IO.Path]::DirectorySeparatorChar
$remainingJava = Get-ChildItem -Path (Join-Path $RepoRoot 'foundation'), (Join-Path $RepoRoot 'business-core'), (Join-Path $RepoRoot 'business-app'), (Join-Path $RepoRoot 'api-server') -Recurse -File -Filter '*.java' |
    Where-Object {
        $file = $_.FullName
        -not $file.Substring($RepoRoot.Length).Contains($buildSegment) -and
        -not ($deletedFullPaths | Where-Object {
            $file.Equals($_, [System.StringComparison]::OrdinalIgnoreCase) -or
            $file.StartsWith($_ + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
        })
    }
$danglingRefs = @()
if ($refPatterns.Count -gt 0) { $danglingRefs = @($remainingJava | Select-String -CaseSensitive -Pattern ($refPatterns -join '|')) }
if ($danglingRefs.Count -gt 0) {
    Write-Host "[WARN] 지우는 Java 타입의 이름이 남은 소스($(@($danglingRefs.Path | Select-Object -Unique).Count)개 파일) — 타입 참조면 그대로 두면 컴파일이 깨진다(문자열 속 이름은 컴파일과 무관하니 그 문자열이 가리키는 대상을 확인하라):" -ForegroundColor Yellow
    foreach ($ref in ($danglingRefs | Select-Object -First 40)) {
        $rel = $ref.Path.Substring($RepoRoot.Length).TrimStart('\', '/')
        Write-Host "    - ${rel}:$($ref.LineNumber)" -ForegroundColor Yellow
    }
    if ($danglingRefs.Count -gt 40) {
        Write-Host "    ... 외 $($danglingRefs.Count - 40)건" -ForegroundColor Yellow
    }
    Write-Host "  소비자까지 함께 정리하거나 npm run base:generate-source projection 을 사용하라." -ForegroundColor Yellow
}

# 7. 잔존 메뉴 시드 행 경고 (tb_menu_info 라우트, versioned migration) ----------
$migrationDir = Join-Path $RepoRoot 'api-server/src/main/resources/db/migration'
$routeCandidates = @(
    $frontendRelPaths |
        Where-Object { $_ -like 'frontend/src/app/*' } |
        ForEach-Object { '/' + ($_ -replace '^frontend/src/app/', '') -replace '/page\.tsx$', '' } |
        Where-Object { $_ -match '^/[a-z]' } |
        Select-Object -Unique
)
$menuHits = @()
if (Test-Path $migrationDir) {
    $sqlFiles = Get-ChildItem -Path $migrationDir -File -Filter '*.sql'
    foreach ($sql in $sqlFiles) {
        $content = Get-Content $sql.FullName -Raw
        if ($content -notmatch 'tb_menu_info') { continue }
        $lineNo = 0
        foreach ($line in (Get-Content $sql.FullName)) {
            $lineNo++
            $hit = $false
            foreach ($route in $routeCandidates) {
                if ($line.Contains("'" + $route)) { $hit = $true; break }
            }
            if (-not $hit) {
                foreach ($d in $deleteList) {
                    if ($line.ToLower().Contains("/$d")) { $hit = $true; break }
                }
            }
            if ($hit) { $menuHits += "$($sql.Name):${lineNo}: $($line.Trim())" }
        }
    }
}
if ($menuHits.Count -gt 0) {
    Write-Host "[WARN] 삭제 도메인 라우트를 참조하는 tb_menu_info 시드/마이그레이션 행 후보($($menuHits.Count)건):" -ForegroundColor Yellow
    foreach ($hit in ($menuHits | Select-Object -First 20)) { Write-Host "    - $hit" -ForegroundColor Yellow }
    if ($menuHits.Count -gt 20) { Write-Host "    ... 외 $($menuHits.Count - 20)건" -ForegroundColor Yellow }
    Write-Host "  잔존 메뉴는 후속 versioned migration 으로 정리하라(V2_45 방식 참고)." -ForegroundColor Yellow
} else {
    Write-Host "[WARN] 경로 근거로 특정된 tb_menu_info 잔존 라우트는 없다. 다만 메뉴-도메인 매핑은 기능 파일에 없으므로," -ForegroundColor Yellow
    Write-Host "       live DB 기준 전수 확인은 node scripts/menu-census.mjs 로 수행하라." -ForegroundColor Yellow
}

# 8. 요약 -----------------------------------------------------------------------

Write-Host "=============================================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Dry run finished. Paths to delete: $($deletedRelPaths.Count) (absent mappings: $($absentRelPaths.Count))" -ForegroundColor Green
} else {
    Write-Host "Deletion finished. Deleted paths: $($deletedRelPaths.Count) (absent mappings: $($absentRelPaths.Count))" -ForegroundColor Green
    Write-Host "삭제 후 ./gradlew clean compileJava compileTestJava 와 pnpm -C frontend run type-check 로 회귀를 확인하라." -ForegroundColor Cyan
}
Write-Host "=============================================" -ForegroundColor Cyan
exit 0
