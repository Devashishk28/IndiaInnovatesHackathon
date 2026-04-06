@echo off
cd /d "%~dp0"
echo Starting ML Engine on http://localhost:8001 ...
"C:\Users\shiva\AppData\Local\Python\bin\python3.exe" -m uvicorn app.main:app --reload --port 8001
pause
