@echo off
REM Install Python modules
cd school_management
if exist requirements.txt (
    echo Installing Python modules from requirements.txt...
    pip install -r requirements.txt
) else (
    echo requirements.txt not found. Skipping Python module installation.
)
cd ..

REM Install Node.js modules for Next.js app
cd my-app
if exist package.json (
    echo Installing Node.js modules with npm...
    npm  install --legacy-peer-deps
) else (
    echo package.json not found. Skipping Node.js module installation.
)
cd ..

echo Installation complete.
pause
