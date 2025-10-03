@echo off
REM ==========================================
REM Build script for Docker deployment
REM ==========================================
REM Run this before pushing to GitHub

echo ==========================================
echo Building Frontend and Backend for Docker
echo ==========================================
echo.

REM Frontend build
echo [1/2] Building Frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    exit /b 1
)
cd ..
echo Frontend build completed!
echo.

REM Backend - no build needed (uses tsx)
echo [2/2] Backend ready (uses tsx runtime)
echo.

echo ==========================================
echo Build completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. git add .
echo 2. git commit -m "build: update dist for deployment"
echo 3. git push
echo.
