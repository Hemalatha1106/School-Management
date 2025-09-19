@echo off
title School Management System Starter
echo =======================================
echo Starting School Management System...
echo =======================================
echo.

:: Start Django Backend (window stays open)
echo Starting Django Backend Server...
start "Django Backend" cmd /k "cd school_management && python manage.py runserver"
echo Backend will be available at: http://localhost:8000
echo.

:: Start Next.js Frontend (window stays open)
echo Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "cd my-app && npm run dev"
echo Frontend will be available at: http://localhost:3000
echo.

:: Give servers a few seconds to initialize
ping 127.0.0.1 -n 6 > nul

:: Open frontend in default browser
start http://localhost:3000

:: Close this launcher terminal
exit
