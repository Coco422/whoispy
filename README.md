# Who is the Spy (谁是卧底) - Online Game

A real-time multiplayer social deduction web game built with Next.js and Socket.io.

![whoispy logo](./public/whoispy-logo.png)

## Features

- 🎮 Real-time multiplayer gameplay (3-8 players)
- 🏠 Room-based system with shareable codes
- 📱 Mobile-friendly responsive design
- 🎲 Automatic role assignment and game flow management
- ⚡ WebSocket-powered instant updates
- 🛠️ Admin panel for word pair management

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Custom Socket.io Server
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma
- **Real-time**: Socket.io
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in multiple browser windows to test multiplayer

## Game Rules

1. **Setup**: 3-8 players join a room
2. **Role Assignment**: One player becomes the Spy (different keyword), others are Civilians (similar keyword)
3. **Description Phase**: Players take turns describing their keyword without revealing it
4. **Voting Phase**: All players vote to eliminate who they think is the spy
5. **Win Conditions**:
   - Civilians win if they eliminate the Spy
   - Spy wins if only 3 players remain and spy is still alive

## Project Structure

```
whoispy/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/             # Utilities
│   ├── server/          # Socket.io server
│   ├── stores/          # Zustand stores
│   └── types/           # TypeScript types
├── prisma/              # Database schema
└── public/              # Static assets
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:studio` - Open Prisma Studio

## Deployment

See deployment guide in docs/DEPLOYMENT.md

## License

MIT
