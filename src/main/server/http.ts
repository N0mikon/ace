/**
 * HTTP Server
 * Serves static browser build files
 */

import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

let httpServer: http.Server | null = null

// MIME types for common file extensions
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
}

// Get browser build directory
function getBrowserBuildDir(): string {
  // In production, browser build will be in resources/browser
  // In development, we could serve from a dev server or build output
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'browser')
  }

  // In development, use the out/browser directory
  return path.join(app.getAppPath(), 'out', 'browser')
}

// Create HTTP server
export function createHttpServer(): http.Server {
  const browserDir = getBrowserBuildDir()

  httpServer = http.createServer((req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method Not Allowed')
      return
    }

    // Parse URL and get pathname
    let pathname = req.url || '/'

    // Remove query string
    const queryIndex = pathname.indexOf('?')
    if (queryIndex !== -1) {
      pathname = pathname.substring(0, queryIndex)
    }

    // Normalize path - serve index.html for root and SPA routes
    if (pathname === '/' || !pathname.includes('.')) {
      pathname = '/index.html'
    }

    // Resolve file path (prevent directory traversal)
    const filePath = path.join(browserDir, pathname)
    if (!filePath.startsWith(browserDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      res.end('Forbidden')
      return
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try serving index.html for SPA fallback
        const indexPath = path.join(browserDir, 'index.html')
        fs.readFile(indexPath, (indexErr, data) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('Not Found')
            return
          }
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
          })
          res.end(data)
        })
        return
      }

      // Get MIME type
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = mimeTypes[ext] || 'application/octet-stream'

      // Read and serve file
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal Server Error')
          return
        }

        // Set caching headers (cache assets, not HTML)
        const cacheControl = ext === '.html' ? 'no-cache' : 'max-age=31536000'

        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': data.length,
          'Cache-Control': cacheControl
        })
        res.end(data)
      })
    })
  })

  return httpServer
}

// Start HTTP server on specified port
export function startHttpServer(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!httpServer) {
      httpServer = createHttpServer()
    }

    httpServer.listen(port, '0.0.0.0', () => {
      const addr = httpServer!.address()
      const actualPort = typeof addr === 'object' && addr ? addr.port : port
      console.log(`[HTTP] Server listening on http://0.0.0.0:${actualPort}`)
      resolve(actualPort)
    })

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[HTTP] Port ${port} in use, trying ${port + 1}`)
        httpServer!.listen(port + 1, '0.0.0.0')
      } else {
        reject(err)
      }
    })
  })
}

// Stop HTTP server
export function stopHttpServer(): Promise<void> {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        httpServer = null
        console.log('[HTTP] Server stopped')
        resolve()
      })
    } else {
      resolve()
    }
  })
}

// Get HTTP server instance
export function getHttpServer(): http.Server | null {
  return httpServer
}
