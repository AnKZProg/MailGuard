@echo off
rem Lance le serveur MailGuard (s'il ne tourne pas deja) puis ouvre le
rem tableau de bord dans le navigateur par defaut. Utilise un build de
rem production (npm run build + npm start) plutot que le mode developpement
rem utilise avant — nettement plus rapide une fois demarre, au prix d'une
rem compilation d'une a deux minutes au premier lancement apres redemarrage.
title MailGuard

cd /d "%~dp0"

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo Preparation de la base de donnees locale...
    call npm run db:push
    if errorlevel 1 (
        echo.
        echo L'initialisation de la base de donnees a echoue.
        pause
        exit /b 1
    )
    echo Compilation de MailGuard, patiente une a deux minutes ^(une seule fois par demarrage^)...
    call npm run build
    if errorlevel 1 (
        echo.
        echo La compilation a echoue - le serveur ne peut pas demarrer.
        pause
        exit /b 1
    )
    echo Demarrage du serveur MailGuard...
    start "MailGuard - Serveur (ne pas fermer cette fenetre)" /min cmd /c "npm run start"
    timeout /t 3 /nobreak >nul
) else (
    echo Le serveur MailGuard tourne deja.
)

start "" "http://localhost:3000"
exit
