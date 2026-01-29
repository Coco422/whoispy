#!/bin/bash

# Quick Start Script for Who is the Spy Game
# This script sets up and starts the development environment

set -e

echo "🎮 Who is the Spy - Quick Start"
echo "================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Setup .env if not exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (you can edit it to customize settings)"
    echo ""
fi

# Check if database exists
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  Setting up database..."
    npm run db:push
    echo ""

    echo "🌱 Seeding database with initial word pairs..."
    npm run db:seed
    echo ""
else
    echo "✅ Database already exists"
    echo ""
fi

echo "================================"
echo "🚀 Starting development server..."
echo ""
echo "The application will be available at:"
echo "   Home: http://localhost:3000"
echo "   Admin: http://localhost:3000/admin (password: admin123)"
echo ""
echo "To test multiplayer:"
echo "   1. Open http://localhost:3000 in multiple browser windows"
echo "   2. Create a room in one window"
echo "   3. Join with the room code in other windows"
echo "   4. Need 3+ players to start a game"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

# Start the development server
npm run dev
