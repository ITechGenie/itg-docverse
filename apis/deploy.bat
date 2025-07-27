@echo off
REM ITG DocVerse - Build and Deploy Script (Windows)

echo 🚀 ITG DocVerse - Build and Deploy Script
echo ==========================================

REM Step 1: Build the React/Vite app
echo 📦 Building React/Vite application...
cd ..\app
call npm install
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)

echo ✅ Frontend build completed successfully!

REM Step 2: Copy built files to FastAPI static directory
echo 📁 Copying built files to FastAPI static directory...
cd ..\apis

REM Create app directory if it doesn't exist
if not exist app mkdir app

REM Remove old files and copy new ones
rmdir /s /q app 2>nul
mkdir app
xcopy /e /i /y ..\app\dist\* app\

echo ✅ Files copied successfully!

REM Step 3: Install Python dependencies
echo 🐍 Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ Python dependencies installation failed!
    exit /b 1
)

echo ✅ Python dependencies installed successfully!

REM Step 4: Run database bootstrap
echo 🗄️  Running database bootstrap...
python scripts\bootstrap.py

if %errorlevel% neq 0 (
    echo ❌ Database bootstrap failed!
    exit /b 1
)

echo ✅ Database bootstrap completed successfully!

REM Step 5: Start the FastAPI server
echo 🌟 Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo Frontend will be served at: http://localhost:8000/
echo API documentation at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
