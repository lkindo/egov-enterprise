# Add k6 to user PATH environment variable

$k6Path = "C:\k6"

# Get current user PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if k6 path already exists
if ($userPath -split ';' -notcontains $k6Path) {
    # Add k6 to PATH
    $newPath = "$userPath;$k6Path"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✅ k6 added to user PATH: $k6Path" -ForegroundColor Green
    Write-Host "`n⚠️  Please restart PowerShell for changes to take effect." -ForegroundColor Yellow
} else {
    Write-Host "✅ k6 is already in PATH" -ForegroundColor Green
}

# Verify
Write-Host "`nCurrent PATH contains k6: $($userPath -split ';' -like '*k6*')" -ForegroundColor Cyan
