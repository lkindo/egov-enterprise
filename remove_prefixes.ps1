
$mapperPath = "d:\project\egov-enterprise\api-server\src\main\resources\mapper\com"

# Function to process files
function Remove-Prefixes {
    param (
        [string]$Path
    )

    $files = Get-ChildItem -Path $Path -Recurse -Filter "*.xml"
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        
        # Replace COMT and LETT with empty string
        # Case insensitive replacement via -ireplace
        # We only replace them if they are part of a word to be safe? 
        # But user said "prefix matches". 
        # Usually SQL is upper case COMTNBBS.
        # We'll use simple string replacement for "COMT" and "LETT".
        
        $newContent = $content -ireplace "COMT", "" -ireplace "LETT", ""
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
            Write-Host "Updated: $($file.Name)"
        }
    }
}

Remove-Prefixes -Path $mapperPath
Write-Host "Prefix removal completed."
