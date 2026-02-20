#!/usr/bin/env pwsh
# Project Cleanup Script
# Usage: .\cleanup-project.ps1 [-WhatIf] [-IncludeLegacy] [-IncludeAIFolders] [-DryRun]

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$IncludeLegacy,
    [switch]$IncludeAIFolders,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Title { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Gray }

function Get-FolderSize {
    param([string]$Path)
    $size = 0
    if (Test-Path $Path) {
        $items = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue
        foreach ($file in $items) {
            $size += $file.Length
        }
    }
    return $size
}

function Format-Size {
    param([long]$size)
    if ($size -lt 0) { return "0 B" }
    $suffixes = @("B", "KB", "MB", "GB", "TB")
    $index = 0
    while ($size -ge 1024 -and $index -lt $suffixes.Length - 1) {
        $size /= 1024
        $index++
    }
    return "{0:N2} {1}" -f $size, $suffixes[$index]
}

Write-Title "========================================"
Write-Title "  Project Cleanup Script"
Write-Title "========================================"
Write-Host ""

Write-Info "Project Root: $PROJECT_ROOT"
Write-Host ""

Write-Warning "WARNING: Recommend to commit to Git before cleanup!"
Write-Host ""
Write-Host "  git add ." -ForegroundColor Gray
Write-Host "  git commit -m 'Before cleanup'" -ForegroundColor Gray
Write-Host ""

if (-not $DryRun -and -not $WhatIfPreference) {
    $confirm = Read-Host "Continue? (y/n)"
    if ($confirm -ne 'y') {
        Write-Info "Cancelled."
        exit 0
    }
}

Write-Host ""

# Items to delete
$itemsToDelete = @(
    "build",
    ".gradle",
    "frontend\.next",
    "frontend\node_modules",
    "encoding-logs",
    "utf8-project-template",
    "config-templates",
    "convert-all-to-utf8.py",
    "convert-all-utf8-recovery.py",
    "convert-encoding.py",
    "convert-service-encoding.py",
    "convert-service-to-utf8.py"
)

if ($IncludeLegacy) {
    $itemsToDelete += "legacy"
    Write-Warning "RED: Will delete legacy code!"
}

if ($IncludeAIFolders) {
    $itemsToDelete += ".agent"
    $itemsToDelete += ".Jules"
    Write-Warning "RED: Will delete AI tool folders!"
}

$totalDeleted = 0
$totalSize = 0

foreach ($item in $itemsToDelete) {
    $path = Join-Path $PROJECT_ROOT $item
    
    if (Test-Path $path) {
        $size = Get-FolderSize -Path $path
        
        if ($WhatIfPreference) {
            Write-Info "  [WhatIf] Delete: $item ($(Format-Size $size))"
        } else {
            try {
                Remove-Item -Path $path -Recurse -Force
                Write-Success "  OK: Deleted $item ($(Format-Size $size))"
                $totalDeleted++
                $totalSize += $size
            } catch {
                Write-Error "  FAIL: $item - $($_.Exception.Message)"
            }
        }
    } else {
        Write-Info "  SKIP: $item (not found)"
    }
}

Write-Host ""

# Check .gitignore
Write-Title "[.gitignore Check]"
Write-Host ""

$gitignorePath = Join-Path $PROJECT_ROOT ".gitignore"
if (Test-Path $gitignorePath) {
    $content = Get-Content $gitignorePath -Raw
    if ($content -match '<<<<<<<|=======|>>>>>>>') {
        Write-Warning "  WARN: .gitignore has merge conflict markers!"
        if (-not $WhatIfPreference) {
            Write-Info "  Already cleaned in previous step"
        }
    } else {
        Write-Success "  OK: .gitignore is clean"
    }
}

Write-Host ""

# Result Report
Write-Title "========================================"
Write-Title "  Cleanup Complete Report"
Write-Title "========================================"
Write-Host ""

Write-Host "  Results:" -ForegroundColor White
Write-Host "     OK: Deleted items: $totalDeleted" -ForegroundColor Green
Write-Host "     OK: Freed space: $(Format-Size $totalSize)" -ForegroundColor Green
Write-Host ""

if ($totalDeleted -gt 0) {
    Write-Success "  OK: Project cleanup completed!"
} else {
    Write-Info "  INFO: Nothing to delete."
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""

if (-not $WhatIfPreference) {
    Write-Host "  1. Commit to Git:" -ForegroundColor Cyan
    Write-Host "     git add ." -ForegroundColor Gray
    Write-Host "     git commit -m 'Cleanup: Remove unnecessary files'" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  2. Remove from Git cache (optional):" -ForegroundColor Cyan
    Write-Host "     git rm -r --cached build/" -ForegroundColor Gray
    Write-Host "     git rm -r --cached .gradle/" -ForegroundColor Gray
    Write-Host "     git rm -r --cached frontend/.next/" -ForegroundColor Gray
    Write-Host "     git commit -m 'Cleanup: Remove cached build artifacts'" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  3. Verify .gitignore:" -ForegroundColor Cyan
Write-Host "     Check .gitignore file content" -ForegroundColor Gray
Write-Host ""
