
$files = @(
    "api-server\src\main\webapp\WEB-INF\jsp\egovframework\com\sym\log\slg\EgovSysHistList.jsp",
    "api-server\src\main\webapp\WEB-INF\jsp\egovframework\com\uss\umt\EgovUserManage.jsp"
)

foreach ($path in $files) {
    if (Test-Path $path) {
        Write-Host "Processing $path ..."
        $content = Get-Content $path -Raw -Encoding UTF8
        
        # Replace 'code=" \n ...' pattern with 'code="'
        # Also handles 'title=" \n ...' if necessary, but focusing on spring:message code
        # Regex: code="\s+ -> code="
        
        $newContent = $content -replace 'code="\s+', 'code="'
        $newContent = $newContent -replace 'title="\s+', 'title="'
        $newContent = $newContent -replace 'value="\s+', 'value="'
        
        if ($content -ne $newContent) {
            Set-Content $path -Value $newContent -Encoding UTF8
            Write-Host "  -> Fixed whitespace issues."
        }
        else {
            Write-Host "  -> No issues found."
        }
    }
    else {
        Write-Host "File not found: $path"
    }
}
