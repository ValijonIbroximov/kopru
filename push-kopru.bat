@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title KOPRU - Automatic GitHub PUSH
set "REPO=https://github.com/ValijonIbroximov/kopru.git"
set "BRANCH=main"
set "AUTHOR=Valijon Ibroximov"
set "EMAIL=valijonibroximov@gmail.com"

echo.
echo ===============================================
echo    KOPRU - Automatic GitHub PUSH
echo ===============================================
echo Folder: %CD%
echo Repo: %REPO%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [1/7] Git not found. Installing with winget...
    where winget >nul 2>&1
    if errorlevel 1 (
        echo ERROR: winget is unavailable. Install Git from https://git-scm.com/download/win
        goto :fail
    )
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    if errorlevel 1 goto :fail
    for %%G in ("%ProgramFiles%\Git\cmd" "%ProgramFiles%\Git\bin" "%LocalAppData%\Programs\Git\cmd") do if exist "%%~G\git.exe" set "PATH=%%~G;!PATH!"
    where git >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Git installed but not available. Reopen terminal or restart Windows.
        goto :fail
    )
)
git --version

REM Verify that this BAT is in the repository root without comparing slash formats.
echo.
echo [2/7] Checking project root and configuring author...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This folder has no Git metadata ^(.git^).
    echo If you downloaded ZIP, clone the repository first:
    echo   git clone %REPO% "C:\Loyihalar\kopru-git"
    echo Then copy your changed project files into that clone and run this script there.
    goto :fail
)
set "PREFIX="
for /f "delims=" %%P in ('git rev-parse --show-prefix') do set "PREFIX=%%P"
if defined PREFIX (
    echo ERROR: This BAT is in a subfolder of the Git repository.
    echo Put it in the project ROOT.
    goto :fail
)

git config --local user.name "%AUTHOR%"
if errorlevel 1 goto :fail
git config --local user.email "%EMAIL%"
if errorlevel 1 goto :fail

REM Ensure the remote cannot silently point at another project.
echo.
echo [3/7] Checking GitHub remote and branch...
set "ORIGIN="
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN=%%R"
if not defined ORIGIN (
    git remote add origin "%REPO%"
    if errorlevel 1 goto :fail
) else (
    if /I not "!ORIGIN!"=="%REPO%" (
        echo ERROR: Existing origin differs from Kopru GitHub URL:
        echo   !ORIGIN!
        echo Expected: %REPO%
        goto :fail
    )
)
set "CURRENT="
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT=%%B"
if /I not "!CURRENT!"=="%BRANCH%" (
    echo ERROR: Current branch is "!CURRENT!", expected "%BRANCH%".
    echo Switch branches manually after checking your changes.
    goto :fail
)

echo.
echo [4/7] Fetching GitHub updates...
git fetch origin "%BRANCH%"
if errorlevel 1 (
    echo ERROR: Fetch failed. Check internet and GitHub authentication.
    goto :fail
)

git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
    echo ERROR: Local repository has no commit. Clone the project to preserve its history.
    goto :fail
)
set "REMOTE_COMMIT="
for /f "delims=" %%H in ('git rev-parse FETCH_HEAD') do set "REMOTE_COMMIT=%%H"
git merge-base --is-ancestor "!REMOTE_COMMIT!" HEAD >nul 2>&1
if errorlevel 1 (
    echo ERROR: GitHub has commits not yet included locally.
    echo For safety, no automatic merge/reset/stash was performed.
    echo First synchronize with GitHub and resolve any conflicts.
    goto :fail
)

REM Block real .env secrets; permit explicit sample templates.
REM Verify that .env.example/.env.sample/.env.template contain no live keys.
echo.
echo [5/7] Checking secret files and staging changes...
set "SECRET="
for /f "delims=" %%F in ('git ls-files --cached --others --exclude-standard') do (
    set "BASENAME=%%~nxF"
    if /I "!BASENAME:~0,4!"==".env" (
        if /I not "!BASENAME!"==".env.example" (
            if /I not "!BASENAME!"==".env.sample" (
                if /I not "!BASENAME!"==".env.template" set "SECRET=%%F"
            )
        )
    )
)
if defined SECRET (
    echo ERROR: Potential secret file found: !SECRET!
    echo Do not commit .env files. Untrack or ignore them before retrying.
    goto :fail
)
echo Template .env.example/.env.sample/.env.template files are allowed.
echo NOTE: Check that templates do not contain real passwords or API keys.
echo Changed files:
git status --short
git add -A
if errorlevel 1 goto :fail

REM Commit only if staged changes exist.
git diff --cached --quiet
if errorlevel 1 (
    echo.
    echo [6/7] Creating commit...
    set "STAMP=%DATE% %TIME%"
    git commit -m "Kopru automatic update"
    if errorlevel 1 goto :fail
) else (
    echo.
    echo [6/7] No new changes to commit.
)

echo.
echo [7/7] Pushing to GitHub...
git push origin HEAD:%BRANCH%
if errorlevel 1 (
    echo ERROR: Push failed. Your local commits are preserved.
    goto :fail
)

echo.
echo ===============================================
echo SUCCESS: Kopru changes pushed to GitHub.
echo ===============================================
git log -1 --format="Commit: %%h - %%s"
echo.
pause
exit /b 0

:fail
echo.
echo ===============================================
echo STOPPED: No force push or destructive reset used.
echo Your local files are preserved.
echo ===============================================
echo.
pause
exit /b 1
