$files = @(
    "d:\project\egov-enterprise\business-suite\src\main\java\nuri\business\service\addressbook\dto\AddressBookDto.java",
    "d:\project\egov-enterprise\business-suite\src\main\java\nuri\business\service\scrap\dto\ScrapDto.java",
    "d:\project\egov-enterprise\business-suite\src\main\java\nuri\business\service\sms\dto\SmsDto.java"
)
$utf8NoBom = New-Object System.Text.UTF8Encoding($False)
foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $c = $c -replace '(?s)\s*// legacy.*?\}', "`n}"
    [System.IO.File]::WriteAllText($f, $c, $utf8NoBom)
}
