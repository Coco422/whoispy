import 'dotenv/config'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocketServer } from './src/server/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const actionId = req.headers['next-action']

      // Next.js Server Actions mismatch (often from stale clients/bots); respond gracefully instead of noisy stack traces.
      if (message.includes('Failed to find Server Action')) {
        console.warn('Server Action not found', {
          url: req.url,
          method: req.method,
          actionId,
          userAgent: req.headers['user-agent'],
        })

        if (!res.headersSent && !res.writableEnded) {
          res.statusCode = 409
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Deployment updated or invalid action. Please refresh the page and try again.')
        }
        return
      }

      console.error('Error occurred handling', req.url, err)
      if (!res.headersSent && !res.writableEnded) {
        res.statusCode = 500
        res.end('internal server error')
      }
    }
  })

  // Initialize Socket.io
  initializeSocketServer(httpServer)

  httpServer.once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running`)
  })
})
