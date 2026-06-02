$files = Get-ChildItem -Path "d:\project\egov-enterprise" -Recurse -Filter "*.java" | Where-Object { $_.FullName -notmatch "\\build\\" -and $_.FullName -notmatch "\\\.gradle\\" }

$utf8NoBom = New-Object System.Text.UTF8Encoding($False)

foreach ($f in $files) {
    # Read file using UTF8 (it can read BOM or no BOM)
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $modified = $false
    
    if ($content -match "getCreatedDate\(" -or $content -match "\.createdDate\(" -or $content -match "getLastModifiedDate\(" -or $content -match "\.lastModifiedDate\(" -or $content -match "getFrstRegisterId\(" -or $content -match "\.frstRegisterId\(" -or $content -match "getLastUpdusrId\(" -or $content -match "\.lastUpdusrId\(") {
        
        $content = $content -replace "getCreatedDate\(", "getCrtDt("
        $content = $content -replace "\.createdDate\(", ".crtDt("
        
        $content = $content -replace "getLastModifiedDate\(", "getMdfcnDt("
        $content = $content -replace "\.lastModifiedDate\(", ".mdfcnDt("
        
        $content = $content -replace "getFrstRegisterId\(", "getFrstRgtrId("
        $content = $content -replace "\.frstRegisterId\(", ".frstRgtrId("
        
        $content = $content -replace "getLastUpdusrId\(", "getLastMdfrId("
        $content = $content -replace "\.lastUpdusrId\(", ".lastMdfrId("
        
        $modified = $true
    }
    
    if ($modified) {
        # Save as UTF8 without BOM
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        Write-Host "Modified: $($f.FullName)"
    }
}
Write-Host "Done replacing legacy BaseEntity/BaseTimeEntity methods."
