# rename-project.ps1
# Usage: ./rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform" [-DryRun]
# Example: ./rename-project.ps1 -NewPackage "com.sk.enterprise" -NewProjectName "sk-framework" -DryRun

param (
    [Parameter(Mandatory=$true)]
    [string]$NewPackage,

    [Parameter(Mandatory=$true)]
    [string]$NewProjectName,

    [string]$OldPackage = "nuri",
    
    [string]$OldProjectName = "egov-enterprise",

    [switch]$DryRun
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting project renaming process..." -ForegroundColor Cyan
Write-Host "  Old Package: $OldPackage"
Write-Host "  New Package: $NewPackage"
Write-Host "  Old Name:    $OldProjectName"
Write-Host "  New Name:    $NewProjectName"
if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be modified." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan

# 1. 파일 내용 치환 대상 목록 정의
$extensions = @("*.java", "*.yml", "*.properties", "*.gradle", "*.json", "*.xml", "*.md", "*.ts", "*.tsx")

# 2. 패키지 문자열 변환용 도트/슬래시 형태 정의
$oldPkgDot = $OldPackage
$newPkgDot = $NewPackage
$oldPkgSlash = $OldPackage.Replace(".", "/")
$newPkgSlash = $NewPackage.Replace(".", "/")

Write-Host "Analyzing files for text replacement..." -ForegroundColor Yellow

$files = Get-ChildItem -Path . -Include $extensions -Recurse -Exclude "node_modules", ".git", ".gradle", "build", ".next"

$replacedCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $modified = $false

    # 패키지 매핑 치환
    if ($content -match $oldPkgDot) {
        $content = $content -replace $oldPkgDot, $newPkgDot
        $modified = $true
    }
    if ($content -match $oldPkgSlash) {
        $content = $content -replace $oldPkgSlash, $newPkgSlash
        $modified = $true
    }
    # 프로젝트명 매핑 치환
    if ($content -match $OldProjectName) {
        $content = $content -replace $OldProjectName, $NewProjectName
        $modified = $true
    }

    if ($modified) {
        if ($DryRun) {
            Write-Host "  [DRYRUN] Would update content in: $($file.FullName)" -ForegroundColor DarkGray
        } else {
            Write-Host "  [UPDATE] Writing updated content to: $($file.FullName)" -ForegroundColor Green
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            $replacedCount++
        }
    }
}

# 3. 실제 자바 패키지 물리 폴더 구조 이동 처리
# 예: src/main/java/nuri/... -> src/main/java/com/mycompany/...
Write-Host "`nRearranging java package directories..." -ForegroundColor Yellow

$javaSrcDirs = Get-ChildItem -Path . -Recurse -Directory -Filter "java" | Where-Object { $_.FullName -notmatch "node_modules|\.git|\.gradle|build" }

foreach ($javaDir in $javaSrcDirs) {
    $targetPkgDir = Join-Path $javaDir.FullName $oldPkgSlash
    if ($oldPkgSlash -and $targetPkgDir -and (Test-Path $targetPkgDir)) {
        $newTargetPkgDir = Join-Path $javaDir.FullName $newPkgSlash
        Write-Host "  [FOUND PACKAGE DIR] $targetPkgDir -> $newTargetPkgDir" -ForegroundColor Green
        
        if ($DryRun) {
            Write-Host "    [DRYRUN] Would move and recreate folder structure." -ForegroundColor DarkGray
        } else {
            # 새 패키지 디렉터리 생성
            New-Item -ItemType Directory -Force -Path $newTargetPkgDir | Out-Null
            # 기존 패키지 하위 파일들을 새 위치로 이동
            Move-Item -Path "$targetPkgDir\*" -Destination $newTargetPkgDir -Force -ErrorAction SilentlyContinue
            # 사용 안 하는 옛 패키지 폴더 삭제
            Remove-Item -Path $targetPkgDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Project renaming process finished." -ForegroundColor Cyan
Write-Host "Modified files: $replacedCount" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
