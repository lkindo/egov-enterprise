$files = Get-ChildItem -Path d:\project\egov-enterprise\foundation\src\test\java -Filter *.java -Recurse
foreach ($file in $files) {
    Write-Host "Fixing BOM in $($file.FullName)"
    $content = Get-Content -Raw -Encoding UTF8 $file.FullName
    [System.IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding($false)))
}
