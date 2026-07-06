$files = Get-ChildItem -Path "d:\project\egov-enterprise\business-suite\src\main\java" -Recurse -Filter "*.java"

$utf8NoBom = New-Object System.Text.UTF8Encoding($False)

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $content
    
    # 1. Getter/Setter 치환
    $content = $content -replace "getCreatedDate\(", "getCrtDt("
    $content = $content -replace "setCreatedDate\(", "setCrtDt("
    
    $content = $content -replace "getLastModifiedDate\(", "getMdfcnDt("
    $content = $content -replace "setLastModifiedDate\(", "setMdfcnDt("
    
    $content = $content -replace "getFrstRegistPnttm\(", "getCrtDt("
    $content = $content -replace "setFrstRegistPnttm\(", "setCrtDt("
    
    $content = $content -replace "getFrstRegisterPnttm\(", "getCrtDt("
    $content = $content -replace "setFrstRegisterPnttm\(", "setCrtDt("
    
    $content = $content -replace "getLastUpdtPnttm\(", "getMdfcnDt("
    $content = $content -replace "setLastUpdtPnttm\(", "setMdfcnDt("
    
    $content = $content -replace "getLastUpdusrPnttm\(", "getMdfcnDt("
    $content = $content -replace "setLastUpdusrPnttm\(", "setMdfcnDt("
    
    $content = $content -replace "getFrstRegisterId\(", "getFrstRgtrId("
    $content = $content -replace "setFrstRegisterId\(", "setFrstRgtrId("
    
    $content = $content -replace "getLastUpdusrId\(", "getLastMdfrId("
    $content = $content -replace "setLastUpdusrId\(", "setLastMdfrId("

    # 2. Builder 치환
    $content = $content -replace "\.createdDate\(", ".crtDt("
    $content = $content -replace "\.lastModifiedDate\(", ".mdfcnDt("
    $content = $content -replace "\.frstRegistPnttm\(", ".crtDt("
    $content = $content -replace "\.frstRegisterPnttm\(", ".crtDt("
    $content = $content -replace "\.lastUpdtPnttm\(", ".mdfcnDt("
    $content = $content -replace "\.lastUpdusrPnttm\(", ".mdfcnDt("
    $content = $content -replace "\.frstRegisterId\(", ".frstRgtrId("
    $content = $content -replace "\.lastUpdusrId\(", ".lastMdfrId("
    
    # 3. Field Declaration (DTOs, Result classes)
    $content = $content -replace "private LocalDateTime createdDate;", "private LocalDateTime crtDt;"
    $content = $content -replace "private LocalDateTime lastModifiedDate;", "private LocalDateTime mdfcnDt;"
    $content = $content -replace "private LocalDateTime frstRegistPnttm;", "private LocalDateTime crtDt;"
    $content = $content -replace "private LocalDateTime frstRegisterPnttm;", "private LocalDateTime crtDt;"
    $content = $content -replace "private LocalDateTime lastUpdtPnttm;", "private LocalDateTime mdfcnDt;"
    $content = $content -replace "private LocalDateTime lastUpdusrPnttm;", "private LocalDateTime mdfcnDt;"
    $content = $content -replace "private String frstRegisterId;", "private String frstRgtrId;"
    $content = $content -replace "private String lastUpdusrId;", "private String lastMdfrId;"

    # 4. Strings in @Mapping
    $content = $content -replace '"createdDate"', '"crtDt"'
    $content = $content -replace '"lastModifiedDate"', '"mdfcnDt"'
    $content = $content -replace '"frstRegistPnttm"', '"crtDt"'
    $content = $content -replace '"frstRegisterPnttm"', '"crtDt"'
    $content = $content -replace '"lastUpdtPnttm"', '"mdfcnDt"'
    $content = $content -replace '"lastUpdusrPnttm"', '"mdfcnDt"'
    $content = $content -replace '"frstRegisterId"', '"frstRgtrId"'
    $content = $content -replace '"lastUpdusrId"', '"lastMdfrId"'

    if ($orig -ne $content) {
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        Write-Host "Modified: $($f.FullName)"
    }
}
Write-Host "Done replacing all legacy usages."
