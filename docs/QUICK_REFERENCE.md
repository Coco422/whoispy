# Quick Reference Card

## 🚀 Quick Start (Development)

```bash
./start.sh
# or
npm install && npm run db:push && npm run db:seed && npm run dev
```

Open http://localhost:3000

## 📦 Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push database schema
npm run db:seed      # Seed initial data
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
```

## 🎮 Testing Multiplayer Locally

1. Start dev server: `npm run dev`
2. Open 3+ browser windows/tabs
3. Create room in window 1 → Get room code
4. Join room in windows 2-3 with the code
5. Start game (need 3-8 players)

## 🔑 Default Credentials

- **Admin Panel**: http://localhost:3000/admin
- **Password**: `admin123` (change in `.env`)

## 📁 Important Files

| File | Purpose |
|------|---------|
| `server.ts` | Custom Next.js + Socket.io server |
| `src/server/socket-server.ts` | Socket event handlers |
| `src/server/game-manager.ts` | Game logic |
| `src/server/room-manager.ts` | Room management |
| `src/app/page.tsx` | Home page |
| `src/app/room/[code]/page.tsx` | Game room |
| `prisma/schema.prisma` | Database schema |
| `.env` | Environment variables |

## 🎯 Game Rules

1. **Players**: 3-8 players per room
2. **Roles**: 1 Spy (different word) + N-1 Civilians (same word)
3. **Phases**:
   - Description: Players describe their word (30s/turn)
   - Voting: Vote for suspected spy (15s)
   - Results: Elimination or game end
4. **Win Conditions**:
   - Civilians win: Eliminate the spy
   - Spy wins: Survive to final 3 players

## 🌐 URLs

| URL | Description |
|-----|-------------|
| `/` | Home (create/join room) |
| `/room/[code]` | Game room |
| `/admin` | Admin panel (word management) |
| `/api/words` | Word pairs API |

## 🔧 Configuration (.env)

```env
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
ADMIN_PASSWORD=admin123
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## 🐛 Common Issues

**Socket won't connect:**
- Check `NEXT_PUBLIC_SOCKET_URL` in `.env`
- Verify server is running on correct port

**Database error:**
- Delete `prisma/dev.db`
- Run `npm run db:push && npm run db:seed`

**Build fails:**
- `rm -rf .next node_modules`
- `npm install && npm run build`

## 📊 Word Pairs

Default: 30 Chinese word pairs pre-seeded
Manage: http://localhost:3000/admin

Examples:
- 橙子 (orange) vs 橘子 (tangerine)
- 面包 (bread) vs 馒头 (steamed bun)
- 饺子 (dumpling) vs 包子 (bun)

## 🚢 Production Deployment

```bash
# Quick deploy
npm install
npm run build
NODE_ENV=production npm start

# With PM2 (recommended)
npm install -g pm2
pm2 start npm --name whoispy -- start
pm2 save
pm2 startup
```

See `DEPLOYMENT.md` for full guide.

## 📚 Documentation

- `README.md` - Project overview
- `DEVELOPMENT.md` - Development guide
- `DEPLOYMENT.md` - Production deployment
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details

## 🏗️ Architecture

```
Client (Browser)
    ↕ Socket.io (WebSocket)
Server (Next.js + Socket.io)
    ↕ Prisma ORM
Database (SQLite/PostgreSQL)
```

## 🎨 Tech Stack

- Next.js 14 + React 18
- TypeScript 5
- Socket.io 4
- Tailwind CSS 3
- Prisma 5
- Zustand 4

## 📝 Features Checklist

✅ Room system (create/join)
✅ Real-time multiplayer (3-8 players)
✅ Role assignment (spy/civilian)
✅ Turn-based description phase
✅ Voting system
✅ Win condition detection
✅ Mobile responsive
✅ Admin panel
✅ 30 word pairs
✅ Timer system
✅ Player management

## 🔐 Security Notes

- Change `ADMIN_PASSWORD` in production
- Use HTTPS/WSS in production
- Use PostgreSQL for production
- Keep dependencies updated
- Enable firewall on server

## 📞 Troubleshooting

1. Check logs: `pm2 logs whoispy` (if using PM2)
2. Verify env vars: `cat .env`
3. Test socket connection: Browser DevTools → Network → WS
4. Check database: `npm run db:studio`
5. Rebuild: `npm run build`

## ⚡ Performance Tips

- Use PostgreSQL in production
- Enable Nginx gzip compression
- Set up CDN for static files
- Monitor with `pm2 monit`
- Clean up inactive rooms (auto after 2h)

## 🎉 Success Indicators

✅ Build completes: `npm run build`
✅ Server starts: `npm start`
✅ Can create room
✅ Can join room
✅ Game flows correctly
✅ Multiple concurrent rooms work

---

**Need Help?** Check the detailed documentation:
- Development: `DEVELOPMENT.md`
- Deployment: `DEPLOYMENT.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`
