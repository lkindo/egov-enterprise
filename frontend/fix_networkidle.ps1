Get-ChildItem 'e2e\*.spec.ts' | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'networkidle', 'domcontentloaded'
    [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($_.Name)"
}
Write-Host "All done"
