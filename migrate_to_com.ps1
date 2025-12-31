
# 1. Remove existing 'let' packages from api-server
$letPath = "d:\project\egov-enterprise\api-server\src\main\java\egovframework\let"
if (Test-Path $letPath) {
    Remove-Item -Recurse -Force $letPath
    Write-Host "Removed legacy 'let' package: $letPath"
}

# 2. Define source and destination
$sourceRoot = "d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\src\main\java\egovframework\com"
$destRoot = "d:\project\egov-enterprise\api-server\src\main\java\egovframework\com"

# 3. Create destination directory if not exists
if (-not (Test-Path $destRoot)) {
    New-Item -ItemType Directory -Path $destRoot -Force
    Write-Host "Created destination 'com' package: $destRoot"
}

# 4. Copy specific components (BBS, Author, User, etc.)
# We copy only what is currently meaningful to avoid bloating, or copy all 'com' structure if requested.
# User asked to "change source to Enterprise Common Component packages", implying a replacement.

Write-Host "Copying 'com' packages from template..."
Copy-Item "$sourceRoot\*" "$destRoot\" -Recurse -Force

# 5. Handle Mappers (Postgres Only)
$mapperSource = "d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\src\main\resources\egovframework\mapper\com"
$mapperDest = "d:\project\egov-enterprise\api-server\src\main\resources\mapper\com"

# Remove existing 'let' mappers
$letMapperPath = "d:\project\egov-enterprise\api-server\src\main\resources\mapper\let"
if (Test-Path $letMapperPath) {
    Remove-Item -Recurse -Force $letMapperPath
    Write-Host "Removed legacy 'let' mappers"
}

if (-not (Test-Path $mapperDest)) {
    New-Item -ItemType Directory -Path $mapperDest -Force
}

# Copy only Postgres mappers
Get-ChildItem -Path $mapperSource -Recurse -Filter "*_postgres.xml" | ForEach-Object {
    $relativePath = $_.FullName.Substring($mapperSource.Length)
    $targetPath = Join-Path $mapperDest $relativePath
    $targetDir = Split-Path $targetPath
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Copy-Item $_.FullName $targetPath -Force
    Write-Host "Copied Mapper: $($_.Name)"
}

Write-Host "Migration script completed."
