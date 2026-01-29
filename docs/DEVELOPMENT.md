# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Initial Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Initialize database:
```bash
npm run db:push
npm run db:seed
```

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Development Workflow

### Testing Multiplayer Locally

1. Start the dev server
2. Open multiple browser windows/tabs
3. Create a room in one window
4. Join with the room code in other windows
5. Test game flow with 3+ players

### Database Management

View database:
```bash
npm run db:studio
```

Reset database:
```bash
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### Adding Word Pairs

1. Go to http://localhost:3000/admin
2. Login with password: `admin123` (or your configured password)
3. Add/edit/delete word pairs

## Project Structure

```
whoispy/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Initial data
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/          # REST API routes
│   │   ├── admin/        # Admin panel
│   │   ├── room/[code]/  # Game room page
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   ├── Game/         # Game components
│   │   ├── Room/         # Room components
│   │   └── ui/           # Reusable UI components
│   ├── lib/
│   │   ├── db/           # Database client
│   │   ├── game/         # Game utilities
│   │   └── socket/       # Socket.io client
│   ├── server/
│   │   ├── game-manager.ts    # Game logic
│   │   ├── room-manager.ts    # Room management
│   │   └── socket-server.ts   # Socket.io server
│   ├── stores/
│   │   ├── game-store.ts      # Game state
│   │   └── room-store.ts      # Room state
│   └── types/
│       ├── game.ts            # Game types
│       └── socket.ts          # Socket event types
├── server.ts              # Custom Next.js server
├── package.json
└── tsconfig.json
```

## Architecture

### Backend Flow

1. **Custom Server** (`server.ts`): Combines Next.js with Socket.io
2. **Room Manager**: Handles room creation, joining, player management
3. **Game Manager**: Handles game logic, phases, win conditions
4. **Socket Server**: Real-time communication between players

### Frontend Flow

1. **Home Page**: Create or join room
2. **Waiting Room**: Players gather before game starts
3. **Game Flow**:
   - Role reveal (spy/civilian)
   - Description phase (players describe their word)
   - Voting phase (vote for suspected spy)
   - Results (elimination or game over)

### State Management

- **Room Store**: Room data, players, game phase
- **Game Store**: Player's role, word, voting status
- **Socket Events**: Real-time updates from server

## Key Features Implementation

### Real-time Communication

Socket.io events:
- `create_room`: Create new game room
- `join_room`: Join existing room
- `start_game`: Begin game (host only)
- `submit_description`: Submit turn description
- `submit_vote`: Vote for player
- `room_update`: Sync room state
- `game_started`: Send role assignments
- `vote_result`: Show elimination results
- `game_over`: End game with results

### Game Logic

**Description Phase:**
- Players take turns (30s each)
- Descriptions displayed in real-time
- Auto-advance on timeout

**Voting Phase:**
- All players vote simultaneously (15s)
- Cannot vote for self
- Highest votes eliminated (no elimination on tie)

**Win Conditions:**
- Civilians win: Spy eliminated
- Spy wins: 3 players remain with spy alive

## Testing Checklist

- [ ] Create room
- [ ] Join room (3-8 players)
- [ ] Start game (role assignment)
- [ ] Description phase (turns, timer)
- [ ] Voting phase
- [ ] Elimination (correct player)
- [ ] Win conditions (both scenarios)
- [ ] Player disconnect/reconnect
- [ ] Multiple concurrent rooms
- [ ] Admin panel (CRUD word pairs)

## Common Issues

**Socket connection fails:**
- Check `NEXT_PUBLIC_SOCKET_URL` in `.env`
- Ensure dev server running on correct port

**Database errors:**
- Delete `prisma/dev.db` and re-run migrations
- Check Prisma schema syntax

**Build errors:**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies

## Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Keep components small and focused
- Handle errors gracefully

## Performance Optimization

- Room cleanup (inactive rooms deleted after 2 hours)
- Efficient socket event handling
- Minimal re-renders with proper state management
- Lazy loading for admin panel

## Future Enhancements

- [ ] Chat system during gameplay
- [ ] Multiple spy mode
- [ ] Game statistics/leaderboard
- [ ] Custom word pairs per room
- [ ] Mobile app (PWA)
- [ ] Spectator mode
- [ ] Replay system

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly (especially multiplayer flow)
4. Submit pull request

## License

MIT
