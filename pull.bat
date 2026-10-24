
@echo off
setlocal EnableExtensions
title KOPRU - Automatic GitHub PULL

set "REPO=https://github.com/ValijonIbroximov/kopru.git"
set "BRANCH=main"
set "PROJECT=%~dp0"
set "CLONE=C:\Loyihalar\kopru-git"

cd /d "%PROJECT%" || goto failed

echo.
echo ===============================================
echo    KOPRU - Automatic GitHub PULL
echo ===============================================
echo Folder: %CD%
echo Repo: %REPO%
echo.

call :checkgit
if errorlevel 1 goto failed

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto zipfolder

for /f "delims=" %%G in ('git rev-parse --show-toplevel') do set "ROOT=%%G"

for %%G in ("%ROOT%") do set "ROOT=%%~fG"
for %%G in ("%CD%") do set "CURRENT=%%~fG"

if /I not "%ROOT%"=="%CURRENT%" (
    echo ERROR: This file must be in project root.
    echo Git root: %ROOT%
    goto failed
)

echo [1/5] Configuring remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REPO%"
) else (
    git remote set-url origin "%REPO%"
)
if errorlevel 1 goto failed

echo [2/5] Checking local changes...
git diff --quiet
if errorlevel 1 goto dirty

git diff --cached --quiet
if errorlevel 1 goto dirty

for /f "delims=" %%S in ('git ls-files --others --exclude-standard') do goto dirty

echo [3/5] Fetching main...
git fetch origin main
if errorlevel 1 goto failed

echo [4/5] Switching to main...
git show-ref --verify --quiet refs/heads/main
if errorlevel 1 (
    git switch --track -c main origin/main
) else (
    git switch main
)
if errorlevel 1 goto failed

echo [5/5] Pulling updates...
git merge --ff-only origin/main
if errorlevel 1 (
    echo.
    echo ERROR: Branch histories diverged.
    echo No force reset was performed.
    goto failed
)

echo.
echo ===============================================
echo    PULL SUCCESSFUL
echo ===============================================
git log -1 --oneline
echo.
pause
exit /b 0

:zipfolder
echo.
echo ZIP folder detected. Git metadata is missing.
echo.
echo Existing ZIP files will NOT be overwritten.
echo.

if exist "%CLONE%\.git" (
    echo Existing Git clone found:
    echo %CLONE%
    echo.
    echo Put pull.bat inside that folder and run it.
    goto failed
)

if exist "%CLONE%" (
    echo ERROR: Clone destination already exists.
    echo %CLONE%
    goto failed
)

echo Cloning into:
echo %CLONE%
echo.

git clone --branch main "%REPO%" "%CLONE%"
if errorlevel 1 goto failed

echo.
echo CLONE SUCCESSFUL.
echo.
echo Your new Git working directory:
echo %CLONE%
echo.
echo Move pull.bat and push.bat there.
echo Your original ZIP files remain unchanged.
echo.
pause
exit /b 0

:dirty
echo.
echo ERROR: Uncommitted or untracked files detected.
echo.
git status --short
echo.
echo Commit your changes using push.bat first,
echo or save them separately before pulling.
goto failed

:checkgit
git --version >nul 2>&1
if not errorlevel 1 exit /b 0

echo Git not installed.
echo Trying automatic installation...

where winget >nul 2>&1
if errorlevel 1 (
    echo ERROR: winget not available.
    echo Install Git from https://git-scm.com/download/win
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
echo PULL STOPPED - Local files preserved
echo ===============================================
echo.
pause
exit /b 1
