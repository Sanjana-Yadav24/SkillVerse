@echo off
title SkillVerse Local Server (Port 5000)
echo ========================================================
echo   Starting SkillVerse on your Windows Computer...
echo ========================================================
echo.
cd /d "%~dp0backend"

echo [Step 1/2] Checking Python packages (flask, flask-cors, python-dotenv, requests)...
python -m pip install -r requirements.txt --quiet

echo.
echo [Step 2/2] Opening http://127.0.0.1:5000 in your browser and starting Flask...
start "" "http://127.0.0.1:5000"
python app.py
pause
