$files = Get-ChildItem -Path "frontend\src" -Include *.ts,*.tsx -Recurse
foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw
        # If it contains "번호" but was not detected as UTF-8, it might be EUC-KR
        # But we'll just rewrite everything to UTF-8
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    } catch {
        Write-Host "Failed to process $($file.FullName)"
    }
}
