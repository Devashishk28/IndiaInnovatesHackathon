@echo off
cd /d "%~dp0"
echo Starting Delhi AQI Backend on http://localhost:8000 ...
"C:\Users\shiva\AppData\Local\Python\bin\python3.exe" -m uvicorn main:app --reload --port 8000
pause
