@echo off
rem Lance MailGuard dans Docker (demarre Docker Desktop si besoin), attend
rem qu'il soit pret puis ouvre le tableau de bord. Le conteneur redemarre
rem ensuite tout seul avec Docker Desktop : ce fichier ne sert qu'a l'ouvrir.
rem Apres une mise a jour du code : docker compose up -d --build
title MailGuard
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 goto nodocker

docker info >nul 2>&1
if not errorlevel 1 goto dockerready
echo Demarrage de Docker Desktop, patiente...
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set tries=0
:waitdocker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto dockerready
set /a tries+=1
if %tries% lss 60 goto waitdocker
echo Docker Desktop ne repond pas. Ouvre-le a la main puis relance ce fichier.
pause
exit /b 1

:dockerready
echo Demarrage de MailGuard (la premiere fois, la construction prend quelques minutes)...
docker compose up -d
if errorlevel 1 goto upfailed

set tries=0
:waitapp
docker inspect -f "{{.State.Health.Status}}" mailguard 2>nul | findstr /x "healthy" >nul
if not errorlevel 1 goto open
timeout /t 2 /nobreak >nul
set /a tries+=1
if %tries% lss 90 goto waitapp
echo MailGuard met du temps a demarrer : voir "docker compose logs mailguard".

:open
start "" "http://127.0.0.1:3000"
exit /b 0

:upfailed
echo.
echo Le conteneur n'a pas pu demarrer. Verifie que .env.local existe et que
echo rien d'autre n'utilise le port 3000, puis voir "docker compose logs mailguard".
pause
exit /b 1

:nodocker
echo Docker n'est pas installe sur ce PC. Voir le README, section Docker.
pause
exit /b 1
