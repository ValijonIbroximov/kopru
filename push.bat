
@echo off
setlocal EnableExtensions
title KOPRU - Automatic GitHub PUSH

set "REPO=https://github.com/ValijonIbroximov/kopru.git"
set "BRANCH=main"
set "AUTHOR=Valijon Ibroximov"
set "EMAIL=valijonibroximov@gmail.com"
set "MSG=Kopru automatic update"

cd /d "%~dp0" || goto failed

echo.
echo ===============================================
echo    KOPRU - Automatic GitHub PUSH
echo ===============================================
echo Folder: %CD%
echo Repo: %REPO%
echo Branch: main
echo.

call :checkgit
if errorlevel 1 goto failed

echo [1/7] Checking repository...

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a Git repository.
    echo.
    echo If downloaded as ZIP, run pull.bat first.
    echo It will create a separate Git clone.
    goto failed
)

for /f "delims=" %%G in ('git rev-parse --show-toplevel') do set "ROOT=%%G"

for %%G in ("%ROOT%") do set "ROOT=%%~fG"
for %%G in ("%CD%") do set "CURRENT=%%~fG"

if /I not "%ROOT%"=="%CURRENT%" (
    echo ERROR: This BAT must be in Git root.
    echo Git root: %ROOT%
    goto failed
)

echo [2/7] Configuring identity...

git config user.name "%AUTHOR%"
if errorlevel 1 goto failed

git config user.email "%EMAIL%"
if errorlevel 1 goto failed

echo [3/7] Configuring GitHub...

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO%"
) else (
    git remote set-url origin "%REPO%"
)
if errorlevel 1 goto failed

git fetch origin main
if errorlevel 1 goto failed

echo [4/7] Checking main branch...

git show-ref --verify --quiet refs/heads/main
if errorlevel 1 (
    echo ERROR: Local main branch is missing.
    echo Use pull.bat to initialize a proper clone.
    goto failed
)

git switch main
if errorlevel 1 (
    echo ERROR: Cannot switch to main.
    echo Check local uncommitted changes.
    goto failed
)

echo [5/7] Checking secret files...

git ls-files -co --exclude-standard -- ".env" ".env.*" "*.pem" "*.key" "*.p12" > "%TEMP%\kopru-secrets-%RANDOM%.txt"

set "SECRETFILE="
for /f "delims=" %%F in ('git ls-files -co --exclude-standard -- ".env" ".env.*" "*.pem" "*.key" "*.p12"') do (
    if /I not "%%~nxF"==".env.example" (
        if /I not "%%~nxF"==".env.sample" (
            if /I not "%%~nxF"==".env.template" (
                set "SECRETFILE=%%F"
                goto secretfound
            )
        )
    )
)

goto stage

:secretfound
echo.
echo ERROR: Possible secret file found.
echo File: %SECRETFILE%
echo.
echo Review and exclude it before pushing.
goto failed

:stage
echo [6/7] Staging and committing changes...

git add -A
if errorlevel 1 goto failed

git diff --cached --quiet
if not errorlevel 1 goto sync

git commit -m "%MSG%"
if errorlevel 1 goto failed

:sync
echo [7/7] Synchronizing and pushing main...

git fetch origin main
if errorlevel 1 goto failed

git merge --ff-only origin/main
if errorlevel 1 (
    echo.
    echo ERROR: Local and remote histories diverged.
    echo Your commit was preserved locally.
    echo Merge or rebase is required.
    goto failed
)

git push -u origin main
if errorlevel 1 goto failed

echo.
echo ===============================================
echo    PUSH SUCCESSFUL - origin/main
echo ===============================================
git log -1 --oneline
echo.
echo GitHub:
echo https://github.com/ValijonIbroximov/kopru
echo.
pause
exit /b 0

:checkgit
git --version >nul 2>&1
if not errorlevel 1 exit /b 0

echo Git not installed.
echo Installing via winget...

where winget >nul 2>&1
if errorlevel 1 (
    echo ERROR: winget unavailable.
    exit /b 1
)

winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 exit /b 1

set "PATH=%PATH%;C:\Program Files\Git\cmd"

git --version >nul 2>&1
if errorlevel 1 (
    echo Restart terminal after installing Git.
    exit /b 1
)

exit /b 0

:failed
echo.
echo ===============================================
echo PUSH STOPPED - No force push used
echo ===============================================
echo.
pause
exit /b 1
