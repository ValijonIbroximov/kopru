@echo off
chcp 65001 >nul
title Kopru - GitHub push
cd /d "%~dp0"

echo.
echo  ================================================
echo   KOPRU - o'zgarishlarni GitHub'ga yuborish
echo  ================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  [XATO] Git topilmadi. https://git-scm.com/download/win dan o'rnating.
  pause
  exit /b 1
)

if not exist ".git" (
  echo  [INFO] Git repozitoriya yo'q - yaratilmoqda...
  git init
  git branch -M main
  set /p REMOTE_URL=  GitHub repo manzilini kiriting (https://github.com/LOGIN/kopru.git):
  git remote add origin "%REMOTE_URL%"
)

git status --short
echo.

set MSG=%*
if "%MSG%"=="" (
  set /p MSG=  Commit izohi (bo'sh qoldirsangiz avtomatik):
)
if "%MSG%"=="" set MSG=Yangilanish %date% %time%

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo  [INFO] Commit qilinmadi - o'zgarish yo'q yoki xato. Push davom etadi.
)

echo.
echo  Push qilinmoqda...
git push -u origin main
if errorlevel 1 (
  echo.
  echo  [XATO] Push muvaffaqiyatsiz. Tekshiring:
  echo    - GitHub'ga kirganmisiz (git credential)?
  echo    - Remote to'g'rimi:  git remote -v
  echo    - Branch nomi main mi:  git branch
  pause
  exit /b 1
)

echo.
echo  [OK] Yuborildi. Vercel 1-3 daqiqada avtomatik deploy qiladi.
echo  Eslatma: Supabase SQL Editor'da supabase\migrations\002_social.sql ni ishga tushirishni unutmang!
echo.
pause
