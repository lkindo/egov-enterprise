# rename-project.ps1
# Usage: ./scripts/rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform" [-DryRun]
# Example: ./scripts/rename-project.ps1 -NewPackage "com.sk.enterprise" -NewProjectName "sk-framework" -DryRun
#
# 치환 대상 확장자는 git ls-files 기반 실측 census(구명칭 'nuri'/'egov-enterprise' 를 실제로
# 포함하는 tracked 파일의 확장자 전수)에서 도출했다. 2026-08-23 실측:
#   java, md, yml, json, mjs, ps1, ts, tsx, js, gradle, imports, toml, sh, py, html
#   + 확장자 없는 CODEOWNERS. (properties/xml/yaml/sql 은 관례상 유지 — sql 은 파생
#   프로젝트 시드가 프로젝트명을 넣는 경로라 예방적으로 포함한다.)
# 제외 디렉터리는 -Exclude 가 아니라 경로 세그먼트 필터로 적용한다.
# (Get-ChildItem -Exclude 는 -Recurse 와 조합해도 하위 디렉터리를 걸러 주지 않는다.)

param (
    [Parameter(Mandatory=$true)]
    [string]$NewPackage,

    [Parameter(Mandatory=$true)]
    [string]$NewProjectName,

    [string]$OldPackage = "nuri",

    [string]$OldProjectName = "egov-enterprise",

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting project renaming process..." -ForegroundColor Cyan
Write-Host "  Repo Root:   $RepoRoot"
Write-Host "  Old Package: $OldPackage"
Write-Host "  New Package: $NewPackage"
Write-Host "  Old Name:    $OldProjectName"
Write-Host "  New Name:    $NewProjectName"
if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be modified." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 파일 내용 치환 대상 목록 정의 (git ls-files census 기반, 헤더 주석 참고)
$includePatterns = @(
    "*.java", "*.yml", "*.yaml", "*.properties", "*.gradle", "*.json", "*.xml",
    "*.md", "*.ts", "*.tsx", "*.js", "*.mjs", "*.sql", "*.html",
    "*.ps1", "*.sh", "*.py", "*.toml", "*.imports", "CODEOWNERS"
)

# 재귀에서 실제로 걸러야 하는 디렉터리 이름 (경로 세그먼트 단위 비교)
$excludedDirNames = @(
    "node_modules", ".git", ".gradle", "build", ".next",
    "dist", "out", "coverage", "test-results", "playwright-report"
)

function Test-ExcludedPath([string]$fullName) {
    $rel = $fullName.Substring($RepoRoot.Length).TrimStart('\', '/')
    foreach ($segment in ($rel -split '[\\/]')) {
        if ($excludedDirNames -contains $segment) { return $true }
    }
    return $false
}

# 2. 패키지 문자열 변환용 도트/슬래시 형태 정의 (검색은 literal escape 후 사용)
$oldPkgDot = $OldPackage
$newPkgDot = $NewPackage
$oldPkgSlash = $OldPackage.Replace(".", "/")
$newPkgSlash = $NewPackage.Replace(".", "/")
$oldPkgDotPattern = [regex]::Escape($oldPkgDot)
$oldPkgSlashPattern = [regex]::Escape($oldPkgSlash)
$oldProjectNamePattern = [regex]::Escape($OldProjectName)

Write-Host "Analyzing files for text replacement..." -ForegroundColor Yellow

$files = Get-ChildItem -Path $RepoRoot -Include $includePatterns -Recurse -File |
    Where-Object { -not (Test-ExcludedPath $_.FullName) }

$replacedCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $modified = $false

    # 패키지 매핑 치환
    if ($content -match $oldPkgDotPattern) {
        $content = $content -replace $oldPkgDotPattern, $newPkgDot
        $modified = $true
    }
    if ($content -match $oldPkgSlashPattern) {
        $content = $content -replace $oldPkgSlashPattern, $newPkgSlash
        $modified = $true
    }
    # 프로젝트명 매핑 치환
    if ($content -match $oldProjectNamePattern) {
        $content = $content -replace $oldProjectNamePattern, $NewProjectName
        $modified = $true
    }

    if ($modified) {
        $replacedCount++
        if ($DryRun) {
            Write-Host "  [DRYRUN] Would update content in: $($file.FullName)" -ForegroundColor DarkGray
        } else {
            Write-Host "  [UPDATE] Writing updated content to: $($file.FullName)" -ForegroundColor Green
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        }
    }
}

# 3. 실제 자바 패키지 물리 폴더 구조 이동 처리
# 예: src/main/java/nuri/... -> src/main/java/com/mycompany/...
Write-Host "`nRearranging java package directories..." -ForegroundColor Yellow

$javaSrcDirs = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Filter "java" |
    Where-Object { -not (Test-ExcludedPath $_.FullName) }

$movedDirCount = 0

foreach ($javaDir in $javaSrcDirs) {
    $targetPkgDir = Join-Path $javaDir.FullName $oldPkgSlash
    if ($oldPkgSlash -and $targetPkgDir -and (Test-Path $targetPkgDir)) {
        $newTargetPkgDir = Join-Path $javaDir.FullName $newPkgSlash
        Write-Host "  [FOUND PACKAGE DIR] $targetPkgDir -> $newTargetPkgDir" -ForegroundColor Green
        $movedDirCount++

        if ($DryRun) {
            Write-Host "    [DRYRUN] Would move and recreate folder structure." -ForegroundColor DarkGray
        } else {
            # 새 패키지 디렉터리 생성
            New-Item -ItemType Directory -Force -Path $newTargetPkgDir | Out-Null
            # 기존 패키지 하위 파일들을 새 위치로 이동
            Move-Item -Path "$targetPkgDir\*" -Destination $newTargetPkgDir -Force
            # 사용 안 하는 옛 패키지 폴더 삭제
            Remove-Item -Path $targetPkgDir -Recurse -Force
        }
    }
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Project renaming process finished." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Files to modify (dry run): $replacedCount / Package dirs to move: $movedDirCount" -ForegroundColor Green
} else {
    Write-Host "Modified files: $replacedCount / Moved package dirs: $movedDirCount" -ForegroundColor Green
}
Write-Host "=============================================" -ForegroundColor Cyan
