
$path = "api-server\src\main\webapp\WEB-INF\jsp\egovframework\com\sym\log\slg\EgovSysHistList.jsp"
$content = Get-Content $path -Raw -Encoding UTF8
if ($content -match 'code=" common') {
    Write-Host "Found typo, fixing..."
    $newContent = $content -replace 'code=" common', 'code="common'
    Set-Content $path -Value $newContent -Encoding UTF8
    Write-Host "Fixed."
} else {
    Write-Host "Typo not found."
}

$check = Get-Content $path -Raw -Encoding UTF8
if ($check -match 'code=" common') {
    Write-Host "FAIL: Typo still present."
} else {
    Write-Host "SUCCESS: Typo removed."
}
