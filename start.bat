@echo off
setlocal EnableDelayedExpansion
title Macrio - Expo (clear + tunnel)

REM Run from repo root: Macrio\start.bat
pushd "%~dp0app"
if errorlevel 1 (
  echo Could not open folder: %~dp0app
  goto :done
)

if not exist "package.json" (
  echo package.json not found in %CD%
  echo Make sure start.bat lives in the Macrio project root.
  goto :done
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found in PATH.
  echo Install Node.js from https://nodejs.org/ then try again.
  goto :done
)

echo Freeing Metro ports 8081 and 8082...
call :killPort 8081
call :killPort 8082
timeout /t 1 /nobreak >nul

echo Starting Expo: npm start -- --clear --tunnel --non-interactive
echo.
call npm start -- --clear --tunnel --non-interactive

goto :done

:killPort
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
  if not "%%a"=="0" (
    echo   Stopping PID %%a on port %~1
    taskkill /F /PID %%a >nul 2>&1
  )
)
exit /b 0

:done
popd 2>nul
echo.
pause
endlocal
