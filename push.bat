@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
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
  echo [1/7] Git not found. Installing via winget...
  where winget >nul 2>&1
  if errorlevel 1 (
    echo ERROR: winget is not available. Install Git from https://git-scm.com/download/win
    goto :failed
  )
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent
  if errorlevel 1 goto :failed
  set "PATH=%ProgramFiles%\Git\cmd;%ProgramFiles(x86)%\Git\cmd;%LocalAppData%\Programs\Git\cmd;%PATH%"
  where git >nul 2>&1
  if errorlevel 1 (
    echo Git installed, but executable not found. Reopen the script or restart Windows.
    goto :failed
  )
)
git --version

echo.
echo [2/7] Configuring identity...
git config --global user.name "%AUTHOR%"
if errorlevel 1 goto :failed
git config --global user.email "%EMAIL%"
if errorlevel 1 goto :failed

REM Accept only this project's repository.
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ZIP folder detected: creating Git metadata without deleting your files...
  git init -b %BRANCH%
  if errorlevel 1 goto :failed
  git remote add origin "%REPO%"
  if errorlevel 1 goto :failed
  git fetch origin %BRANCH%
  if errorlevel 1 goto :failed
  REM Align the INDEX with the remote snapshot, never overwrite working files.
  git reset --mixed origin/%BRANCH%
  if errorlevel 1 goto :failed
  git branch -M %BRANCH%
  if errorlevel 1 goto :failed
  git branch --set-upstream-to=origin/%BRANCH% %BRANCH% >nul 2>&1
)

for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "ROOT=%%R"
if /I not "%ROOT%"=="%CD%" (
  echo ERROR: Place this file in the ROOT of the Kopru project.
  echo Git root: %ROOT%
  goto :failed
)
for /f "delims=" %%U in ('git remote get-url origin 2^>nul') do set "REMOTE_URL=%%U"
if not defined REMOTE_URL (
  git remote add origin "%REPO%"
  if errorlevel 1 goto :failed
) else (
  if /I not "%REMOTE_URL%"=="%REPO%" if /I not "%REMOTE_URL%"=="https://github.com/ValijonIbroximov/kopru" (
    echo ERROR: origin points to another repository: %REMOTE_URL%
    echo No remote was changed.
    goto :failed
  )
)

echo.
echo [3/7] Fetching remote history...
git fetch origin %BRANCH%
if errorlevel 1 goto :failed
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /I not "%CURRENT_BRANCH%"=="%BRANCH%" (
  echo ERROR: Current branch is %CURRENT_BRANCH%, expected %BRANCH%.
  goto :failed
)
REM Never push over unmerged changes or rewrite remote commits.
git ls-files -u | findstr /r "." >nul
if not errorlevel 1 (
  echo ERROR: Resolve existing merge conflicts first.
  goto :failed
)
for /f %%N in ('git rev-list --count HEAD..origin/%BRANCH%') do set "BEHIND=%%N"
if not "%BEHIND%"=="0" (
  echo.
  echo WARNING: GitHub contains %BEHIND% newer commit(s).
  echo Local files will NOT be overwritten.
  echo First synchronize with pull.bat or manually merge your changes.
  goto :failed
)

echo.
echo [4/7] Changed files:
git status --short
if errorlevel 1 goto :failed
REM Stage all changes and reject secret files before committing.
echo.
echo [5/7] Staging and scanning sensitive paths...
git add -A
if errorlevel 1 goto :failed
for %%S in (.env .env.local .env.production .env.development .env.test) do (
  git ls-files --error-unmatch "%%S" >nul 2>&1
  if not errorlevel 1 (
    echo ERROR: Sensitive file %%S is tracked or staged. Remove from Git index before pushing.
    goto :failed
  )
)
REM Check nested .env files as well.
git ls-files | findstr /i /r "\(^\|/\)\.env\($\|\.\)" >nul
if not errorlevel 1 (
  echo ERROR: Possible tracked .env file detected. Review git ls-files before pushing.
  goto :failed
)
git diff --cached --quiet
if errorlevel 1 (
  echo.
  echo [6/7] Creating automatic commit...
  git commit -m "Kopru: automatic update %DATE% %TIME%"
  if errorlevel 1 goto :failed
) else (
  echo [6/7] No new changes to commit.
)
echo.
echo [7/7] Pushing to GitHub...
git push -u origin %BRANCH%
if errorlevel 1 goto :failed
echo.
echo ===============================================
echo SUCCESS: Kopru synchronized with GitHub.
echo ===============================================
git log -1 --format="Commit: %%h - %%s"
echo.
pause
exit /b 0
:failed
echo.
echo ===============================================
echo STOPPED: No force push or destructive reset used.
echo Check error messages above.
echo ===============================================
echo.
pause
exit /b 1
