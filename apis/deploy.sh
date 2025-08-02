#!/bin/bash

# ITG DocVerse - Build and Deploy Script (Unix/Linux/macOS)

echo "🚀 ITG DocVerse - Build and Deploy Script"
echo "=========================================="

# Step 1: Build the React/Vite app
echo "📦 Building React/Vite application..."
cd ../app
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build completed successfully!"

# Step 2: Copy built files to FastAPI static directory
echo "📁 Copying built files to FastAPI static directory..."
cd ../apis

# Create app directory if it doesn't exist
mkdir -p app

# Remove old files and copy new ones
rm -rf app/*
cp -r ../app/dist/* app/

echo "✅ Files copied successfully!"

# Step 3: Install Python dependencies
echo "🐍 Installing Python dependencies..."

# Check if virtual environment exists, create if not
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install/upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Python dependencies installation failed!"
    exit 1
fi

echo "✅ Python dependencies installed successfully!"

# Step 4: Run database bootstrap
echo "🗄️  Running database bootstrap..."
python bootstrap.py

if [ $? -ne 0 ]; then
    echo "❌ Database bootstrap failed!"
    exit 1
fi

echo "✅ Database bootstrap completed successfully!"

# Step 5: Start the FastAPI server
echo "🌟 Starting FastAPI server..."
echo "Server will be available at: http://localhost:8000"
echo "Frontend will be served at: http://localhost:8000/"
echo "API documentation at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py
