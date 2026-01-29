# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- A server with at least 1GB RAM
- Domain name (optional, but recommended for production)

## Environment Setup

1. Clone the repository to your server
2. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
# For production, use PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/whoispy"

# Or keep SQLite for simpler deployment
DATABASE_URL="file:./prod.db"

# Server port
PORT=3000
NODE_ENV=production

# Admin password (change this!)
ADMIN_PASSWORD=your-secure-password-here

# Socket.io URL (use your domain with wss://)
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

For SQLite (simpler):
```bash
npm run db:push
npm run db:seed
```

For PostgreSQL (recommended for production):
1. Create a PostgreSQL database
2. Update `DATABASE_URL` in `.env`
3. Run migrations:
```bash
npm run db:push
npm run db:seed
```

### 3. Build the Application

```bash
npm run build
```

### 4. Start the Server

For testing:
```bash
npm start
```

For production with PM2 (recommended):
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "whoispy" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Nginx Configuration (Optional but Recommended)

If you want to use a domain name and SSL:

1. Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

2. Create Nginx configuration:
```nginx
# /etc/nginx/sites-available/whoispy

upstream whoispy_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (use certbot to generate)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # WebSocket support
    location / {
        proxy_pass http://whoispy_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io specific
    location /socket.io/ {
        proxy_pass http://whoispy_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/whoispy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Get SSL certificate with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Firewall Configuration

Allow HTTP, HTTPS, and your app port:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # If not using Nginx
```

## Monitoring and Logs

If using PM2:
```bash
# View logs
pm2 logs whoispy

# Monitor
pm2 monit

# Restart
pm2 restart whoispy

# Stop
pm2 stop whoispy
```

## Maintenance

### Update Word Pairs

Access the admin panel at `https://yourdomain.com/admin` with your admin password.

### Database Backup (SQLite)

```bash
# Backup
cp prisma/prod.db prisma/prod.db.backup

# Restore
cp prisma/prod.db.backup prisma/prod.db
```

### Database Backup (PostgreSQL)

```bash
# Backup
pg_dump whoispy > backup.sql

# Restore
psql whoispy < backup.sql
```

## Troubleshooting

### WebSocket Connection Issues

1. Check that your firewall allows WebSocket connections
2. Verify `NEXT_PUBLIC_SOCKET_URL` uses the correct protocol (wss:// for HTTPS)
3. Check Nginx configuration includes WebSocket upgrade headers

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check database server is running
3. Ensure database user has proper permissions

### Build Fails

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version: `node --version` (should be 18+)

## Performance Tips

1. Use PostgreSQL for production (better performance with multiple concurrent games)
2. Enable gzip compression in Nginx
3. Set up CDN for static assets
4. Monitor memory usage with `pm2 monit`
5. Set up log rotation to prevent disk space issues

## Security Checklist

- [ ] Change default admin password
- [ ] Use HTTPS in production
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Restrict database access to localhost
- [ ] Set up firewall rules
- [ ] Regular backups
- [ ] Monitor error logs

## Scaling

For high traffic:

1. Use PostgreSQL for better concurrent handling
2. Consider Redis for session storage (future enhancement)
3. Set up load balancer with multiple instances
4. Use separate database server
5. Implement rate limiting

## Support

For issues, check:
- Application logs: `pm2 logs whoispy`
- Nginx logs: `/var/log/nginx/error.log`
- Database logs: Check your database server logs
