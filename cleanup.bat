@echo off
chcp 65001 > nul
title Project Cleanup

echo ========================================
echo   Project Cleanup
echo ========================================
echo.
echo Deleting unnecessary files...
echo.

REM Gradle build
if exist "build" (
    echo [OK] Deleting build/
    rmdir /s /q build
)

if exist ".gradle" (
    echo [OK] Deleting .gradle/
    rmdir /s /q .gradle
)

REM Frontend build
if exist "frontend\.next" (
    echo [OK] Deleting frontend\.next/
    rmdir /s /q frontend\.next
)

if exist "frontend\node_modules" (
    echo [OK] Deleting frontend\node_modules/
    rmdir /s /q frontend\node_modules
)

REM Temp logs
if exist "encoding-logs" (
    echo [OK] Deleting encoding-logs/
    rmdir /s /q encoding-logs
)

REM Duplicate templates
if exist "utf8-project-template" (
    echo [OK] Deleting utf8-project-template/
    rmdir /s /q utf8-project-template
)

if exist "config-templates" (
    echo [OK] Deleting config-templates/
    rmdir /s /q config-templates
)

REM One-time scripts
for %%f in (
    convert-all-to-utf8.py
    convert-all-utf8-recovery.py
    convert-encoding.py
    convert-service-encoding.py
    convert-service-to-utf8.py
) do (
    if exist "%%f" (
        echo [OK] Deleting %%f
        del /q "%%f"
    )
)

echo.
echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. git add .
echo   2. git commit -m "Cleanup: Remove unnecessary files"
echo.

pause
