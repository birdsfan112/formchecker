@echo off
echo.
echo  FormCheck - AI Fitness Coach
echo  ============================
echo.
echo  [1] Laptop only (HTTP - port 8080)
echo  [2] Laptop + Phone (HTTPS - port 8443)
echo.
set /p choice="  Choose mode (1 or 2): "

if "%choice%"=="2" goto https_mode

:http_mode
:: Try the Windows Python Launcher first (most reliable on Windows)
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Starting HTTP server with py...
    echo  Open your browser to: http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop.
    echo.
    py -m http.server 8080
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Starting HTTP server with python...
    echo  Open your browser to: http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop.
    echo.
    python -m http.server 8080
    goto :end
)

where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Starting HTTP server with python3...
    echo  Open your browser to: http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop.
    echo.
    python3 -m http.server 8080
    goto :end
)

goto :no_python

:https_mode
:: Try the Windows Python Launcher first
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    py server.py
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    python server.py
    goto :end
)

where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    python3 server.py
    goto :end
)

:no_python
echo.
echo  ERROR: Python is not installed or not on your PATH.
echo.
echo  To fix this, either:
echo    1. Install Python from https://www.python.org/downloads/
echo       (check "Add Python to PATH" during install)
echo    2. Or open a terminal and type: winget install Python.Python.3.12
echo.
echo  Press any key to close...
pause >nul

:end
