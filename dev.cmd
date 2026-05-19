@echo off
echo.
echo ============================================
echo  StudyLink - Vue Development Server
echo ============================================
echo.
echo Starting backend on port 3001...
echo Starting frontend on port 5173...
echo.
echo Navigate to: http://localhost:5173
echo API: http://localhost:3001/api
echo.
echo Press Ctrl+C to stop both servers
echo.

npm run dev:server

pause
