# 레거시 Java 파일들을 CP949 에서 UTF-8 로 일괄 변환
# 사용법: .\convert-legacy-to-utf8.ps1

$legacyPath = "D:\project\egov-enterprise\api-server\src\main\java\egovframework"

# 모든 Java 파일 찾기
$files = Get-ChildItem -Path $legacyPath -Filter *.java -Recurse

Write-Host "Found $($files.Count) Java files to convert..."

foreach ($file in $files) {
    try {
        # CP949 로 읽기
        $content = Get-Content -Path $file.FullName -Encoding Default
        
        # UTF-8 로 저장 (BOM 없이)
        $content | Set-Content -Path $file.FullName -Encoding UTF8
        
        Write-Host "Converted: $($file.Name)"
    }
    catch {
        Write-Warning "Failed to convert: $($file.FullName) - $($_.Exception.Message)"
    }
}

Write-Host "Conversion completed!"
