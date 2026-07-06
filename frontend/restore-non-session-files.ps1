# Selective git restore - preserve session files, restore rest from HEAD
$sessionFiles = @(
    "src/app/admin/system/logs/page.tsx",
    "src/app/admin/system/logs/privacy/page.tsx",
    "src/app/admin/system/logs/system/page.tsx",
    "src/app/admin/system/logs/user/page.tsx",
    "src/app/admin/system/logs/web/page.tsx",
    "src/app/admin/system/logs/transfer/page.tsx",
    "src/app/admin/system/logs/login/page.tsx",
    "src/app/admin/community/boards/master/page.tsx",
    "src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx",
    "src/app/admin/collaboration/CollaborationHubClient.tsx",
    "src/app/components/ui/standard-data-table.tsx"
)

$modifiedFiles = git status --short 2>&1 |
    Where-Object { $_ -match "^ M " } |
    ForEach-Object { ($_ -replace "^ M ", "").Trim() } |
    Where-Object { $_ -match "^src/" }

Write-Host "Total modified: $($modifiedFiles.Count)"

$restoreFiles = $modifiedFiles | Where-Object {
    $file = $_
    -not ($sessionFiles | Where-Object { $_ -eq $file })
}

Write-Host "Restore count: $($restoreFiles.Count)"
Write-Host "Preserve count: $(($modifiedFiles.Count - $restoreFiles.Count))"

$restored = 0
$failed = 0

foreach ($file in $restoreFiles) {
    try {
        git checkout HEAD -- $file 2>&1 | Out-Null
        $restored++
        if ($restored % 20 -eq 0) {
            Write-Host "Progress: $restored/$($restoreFiles.Count) done..."
        }
    } catch {
        Write-Host "FAIL: $file"
        $failed++
    }
}

Write-Host ""
Write-Host "=== DONE ==="
Write-Host "Restored: $restored files"
Write-Host "Failed: $failed files"
