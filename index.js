/**
 * dsh-works-gallery — 作品库 / Works gallery (Host half).
 *
 * Three read-only things:
 *   1. GET  /dsh-works-gallery/api/list    scan the workspace roots for images/videos,
 *                                          newest first
 *   2. GET  /dsh-works-gallery/file        stream one file (Range supported, so video
 *                                          seeking works)
 *   3. POST /dsh-works-gallery/api/reveal  open the file in the OS file manager
 *
 * Roots come from DSH_WORKS_GALLERY_ROOTS (`;` separated on Windows, `:` on
 * macOS/Linux). When unset, it scans the DSH workspaces directory
 * (~/Documents/deepseek-harness), which is where generated images and videos
 * land; if that does not exist it falls back to ~/Documents.
 *
 * Nothing here writes, moves or deletes a file.
 */
import { createReadStream, statSync, readdirSync, realpathSync } from 'node:fs'
import { join, resolve, extname, sep, basename, dirname, delimiter } from 'node:path'
import { homedir } from 'node:os'
import { spawn } from 'node:child_process'

export const name = 'dsh-works-gallery'
export const inject = ['webServer']

const ROUTE = '/dsh-works-gallery'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.svg'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.mkv'])

// Dependencies, caches and build output are never part of a gallery.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '__pycache__', '.cache', 'cache', '.venv', 'venv',
  '.next', '.nuxt', 'dist', '.turbo', '.pnpm-store', '$Recycle.Bin', 'System Volume Information',
])

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
}

const MAX_ITEMS = 5000
const MAX_DEPTH = 8
const CACHE_MS = 10_000

function defaultRoots() {
  const dsh = join(homedir(), 'Documents', 'deepseek-harness')
  try {
    if (statSync(dsh).isDirectory()) return [dsh]
  } catch { /* not there — fall through */ }
  return [join(homedir(), 'Documents')]
}

export function roots() {
  const raw = process.env.DSH_WORKS_GALLERY_ROOTS
  if (raw && raw.trim()) {
    return raw.split(delimiter).map((s) => s.trim()).filter(Boolean)
  }
  return defaultRoots()
}

function kindOf(ext) {
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  return null
}

function walk(dir, rootDir, out, depth) {
  if (out.length >= MAX_ITEMS || depth > MAX_DEPTH) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (out.length >= MAX_ITEMS) return
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      walk(full, rootDir, out, depth + 1)
      continue
    }
    if (!entry.isFile()) continue
    const ext = extname(entry.name).toLowerCase()
    const kind = kindOf(ext)
    if (!kind) continue
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.size <= 0) continue
    const rel = full.slice(rootDir.length + 1)
    const group = rel.includes(sep) ? rel.slice(0, rel.indexOf(sep)) : ''
    out.push({
      path: full,
      name: entry.name,
      rel,
      group,
      kind,
      ext: ext.slice(1),
      size: st.size,
      mtime: st.mtimeMs,
    })
  }
}

function isInside(child, parent) {
  const a = resolve(child).toLowerCase()
  const b = resolve(parent).toLowerCase()
  return a === b || a.startsWith(b.endsWith(sep) ? b : b + sep)
}

/** Resolve symlinks before the root check, so a link cannot walk out of a root. */
function insideRoots(fullPath) {
  let real
  try {
    real = realpathSync(fullPath)
  } catch {
    return false
  }
  return roots().some((root) => {
    let realRoot
    try {
      realRoot = realpathSync(root)
    } catch {
      realRoot = resolve(root)
    }
    return isInside(real, realRoot)
  })
}

function json(res, code, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(body)),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function sendFile(req, res, fullPath) {
  let st
  try {
    st = statSync(fullPath)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('not found')
    return
  }
  if (!st.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('not a file')
    return
  }
  const ext = extname(fullPath).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  const total = st.size
  const range = req.headers.range

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim())
    if (m) {
      let start = m[1] === '' ? null : Number(m[1])
      let end = m[2] === '' ? null : Number(m[2])
      if (start === null && end === null) {
        // Malformed range: fall through and send the whole file.
      } else {
        if (start === null) {
          start = Math.max(0, total - end)
          end = total - 1
        } else if (end === null || end >= total) {
          end = total - 1
        }
        if (start > end || start >= total) {
          res.writeHead(416, { 'Content-Range': `bytes */${total}` })
          res.end()
          return
        }
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=86400',
        })
        if (req.method === 'HEAD') return res.end()
        createReadStream(fullPath, { start, end }).pipe(res)
        return
      }
    }
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(total),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=86400',
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(fullPath).pipe(res)
}

/** Reveal one file in Explorer / Finder / the desktop file manager. */
function reveal(fullPath) {
  const dir = dirname(fullPath)
  if (process.platform === 'win32') {
    spawn('explorer.exe', ['/select,', fullPath], { detached: true, stdio: 'ignore' }).unref()
    return
  }
  if (process.platform === 'darwin') {
    spawn('open', ['-R', fullPath], { detached: true, stdio: 'ignore' }).unref()
    return
  }
  spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref()
}

function makeHandler(state) {
  return function handler(req, res) {
    let url
    try {
      url = new URL(req.url || '/', 'http://127.0.0.1')
    } catch {
      res.writeHead(400)
      return res.end()
    }
    const pathname = url.pathname
    const sub = pathname.startsWith(ROUTE) ? pathname.slice(ROUTE.length) : pathname

    if (sub === '/api/list') {
      const now = Date.now()
      if (state.cache && now - state.cache.at < CACHE_MS) {
        return json(res, 200, state.cache.payload)
      }
      const allowed = roots()
      const items = []
      const scanned = []
      for (const root of allowed) {
        try {
          if (!statSync(root).isDirectory()) continue
        } catch {
          continue
        }
        const before = items.length
        walk(root, root, items, 0)
        scanned.push({ root, count: items.length - before })
      }
      items.sort((a, b) => b.mtime - a.mtime)
      const payload = {
        ok: true,
        roots: scanned,
        total: items.length,
        truncated: items.length >= MAX_ITEMS,
        items: items.map((item) => ({
          ...item,
          url: `${ROUTE}/file?path=${encodeURIComponent(item.path)}`,
        })),
      }
      state.cache = { at: now, payload }
      return json(res, 200, payload)
    }

    if (sub === '/file') {
      const p = url.searchParams.get('path')
      if (!p) return json(res, 400, { ok: false, error: 'path required' })
      const full = resolve(p)
      if (!insideRoots(full)) return json(res, 403, { ok: false, error: 'outside allowed roots' })
      if (!kindOf(extname(full).toLowerCase())) {
        return json(res, 403, { ok: false, error: 'not a media file' })
      }
      return sendFile(req, res, full)
    }

    if (sub === '/api/reveal') {
      const p = url.searchParams.get('path')
      if (!p) return json(res, 400, { ok: false, error: 'path required' })
      const full = resolve(p)
      if (!insideRoots(full)) return json(res, 403, { ok: false, error: 'outside allowed roots' })
      try {
        reveal(full)
      } catch (error) {
        return json(res, 500, { ok: false, error: String((error && error.message) || error) })
      }
      return json(res, 200, { ok: true })
    }

    if (sub === '/' || sub === '') {
      return json(res, 200, { ok: true, service: 'dsh-works-gallery', roots: roots() })
    }

    return json(res, 404, { ok: false, error: 'not found' })
  }
}

export function apply(ctx) {
  const webServer = ctx.webServer ?? (typeof ctx.get === 'function' ? ctx.get('webServer') : undefined)
  if (!webServer) {
    console.log('[works-gallery] no webServer service; gallery disabled')
    return
  }
  const state = { cache: null }
  ctx.effect(() => webServer.register({ kind: 'prefix', path: ROUTE, handler: makeHandler(state) }), 'dsh-works-gallery: routes')
  console.log('[works-gallery] ready at', ROUTE, 'roots:', roots().join(' | '))
}
