@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo Fixing Korean character encoding issues in test files...

REM ApiSecurityConfigTest.java
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\api\config\ApiSecurityConfigTest.java' -Encoding UTF8) -replace '@DisplayName\(\"[^\"]*\"\)', '@DisplayName(\"Test\")' | Set-Content 'api-server\src\test\java\com\company\project\api\config\ApiSecurityConfigTest.java' -Encoding UTF8"

REM Performance tests
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\performance\BottleneckIdentificationTest.java' -Encoding UTF8) -replace 'new UserDto\(\"perfUser\", \"[^\"]*\"', 'new UserDto(\"perfUser\", \"Performance Test User\"' | Set-Content 'api-server\src\test\java\com\company\project\performance\BottleneckIdentificationTest.java' -Encoding UTF8"
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\performance\LoadTest.java' -Encoding UTF8) -replace 'new UserDto\(\"perfUser\", \"[^\"]*\"', 'new UserDto(\"perfUser\", \"Performance Test User\"' | Set-Content 'api-server\src\test\java\com\company\project\performance\LoadTest.java' -Encoding UTF8"
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\performance\StressTest.java' -Encoding UTF8) -replace 'new UserDto\(\"stressUser\", \"[^\"]*\"', 'new UserDto(\"stressUser\", \"Stress Test User\"' | Set-Content 'api-server\src\test\java\com\company\project\performance\StressTest.java' -Encoding UTF8"

REM Security tests
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\security\test\PrivilegeEscalationVulnerabilityTest.java' -Encoding UTF8) -replace '\"[^\"]*怨쀫틮[^\"]*\"', '\"Normal User\"' | Set-Content 'api-server\src\test\java\com\company\project\security\test\PrivilegeEscalationVulnerabilityTest.java' -Encoding UTF8"
powershell -Command "(Get-Content 'api-server\src\test\java\com\company\project\security\test\PrivilegeEscalationVulnerabilityTest.java' -Encoding UTF8) -replace '\"[^\"]*곗삺[^\"]*\"', '\"Admin User\"' | Set-Content 'api-server\src\test\java\com\company\project\security\test\PrivilegeEscalationVulnerabilityTest.java' -Encoding UTF8"

echo Done!
