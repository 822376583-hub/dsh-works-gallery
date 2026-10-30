/**
 * dsh-works-gallery — 作品库 / Works gallery (Client half).
 *
 * Registers a right-sidebar tab that lays every image and video found in your
 * workspace out as a thumbnail wall, newest first, so you no longer have to
 * scroll back through chats to find what you made yesterday.
 *
 * Data comes from the Host half's read-only routes:
 *   GET /dsh-works-gallery/api/list | /file | /api/reveal
 *
 * Loaded as a dsh.client bundle: the loader id must equal the package name.
 */
window.__ModuleLoader__.load({
  id: 'dsh-works-gallery',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const TAB_ID = 'dsh-works-gallery'
    const TAB_KIND = 'works-gallery'
    const API = '/dsh-works-gallery'

    const LOCALES = {
      zh: {
        tab: '作品库',
        guide: '作品库',
        guideDesc: '画过的图、剪过的视频，按时间倒序一次看全',
        today: '今天',
        yesterday: '昨天',
        scanning: '正在扫描…',
        counts: (images, videos) => images + ' 图 · ' + videos + ' 视频',
        all: '全部',
        images: '图片',
        videos: '视频',
        search: '搜文件名…',
        refresh: '刷新',
        refreshTitle: '重新扫描',
        loading: '正在扫工作区里的图片和视频…',
        failed: '扫描失败：',
        timeout: '扫描超时（文件太多时偶发，点刷新重试）',
        badResponse: '接口返回异常',
        http: (code) => 'HTTP ' + code,
        emptyTitle: '这里还什么都没有',
        emptyHint: '等我在工作区里画出第一张图、剪出第一段视频，它就会出现在这儿',
        reveal: '在文件夹中显示',
        copy: '复制路径',
        copied: '已复制',
        close: '关闭 (Esc)',
      },
      en: {
        tab: 'Gallery',
        guide: 'Gallery',
        guideDesc: 'Every image and clip you made, newest first, in one place',
        today: 'Today',
        yesterday: 'Yesterday',
        scanning: 'Scanning…',
        counts: (images, videos) => images + ' img · ' + videos + ' vid',
        all: 'All',
        images: 'Images',
        videos: 'Videos',
        search: 'Search file name…',
        refresh: 'Refresh',
        refreshTitle: 'Scan again',
        loading: 'Scanning the workspace for images and videos…',
        failed: 'Scan failed: ',
        timeout: 'Scan timed out (happens with huge folders) — hit refresh to retry',
        badResponse: 'Unexpected response',
        http: (code) => 'HTTP ' + code,
        emptyTitle: 'Nothing here yet',
        emptyHint: 'Once an image gets drawn or a clip gets cut in the workspace, it shows up here',
        reveal: 'Show in folder',
        copy: 'Copy path',
        copied: 'Copied',
        close: 'Close (Esc)',
      },
    }

    function pickLocale() {
      try {
        const lang = String((typeof navigator !== 'undefined' && navigator.language) || '').toLowerCase()
        return lang.startsWith('zh') ? 'zh' : 'en'
      } catch (e) {
        return 'zh'
      }
    }

    const L = LOCALES[pickLocale()]

    const CSS = `
.wg-root{display:flex;flex-direction:column;height:100%;min-height:0;font-size:13px;color:var(--dsw-alias-label-primary,#e6e6e6)}
.wg-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));flex:none}
.wg-count{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa0a6);margin-right:auto}
.wg-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:8px;overflow:hidden}
.wg-seg button{border:0;background:transparent;color:inherit;padding:4px 9px;font-size:12px;cursor:pointer}
.wg-seg button+button{border-left:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14))}
.wg-seg button.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 22%,transparent);color:var(--dsw-alias-brand-primary,#4c78ff)}
.wg-btn{border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));color:inherit;border-radius:8px;padding:4px 9px;font-size:12px;cursor:pointer}
.wg-btn:hover{border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.wg-search{flex:1 1 90px;min-width:80px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.2));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:8px;padding:4px 8px;color:inherit;font-size:12px;outline:none}
.wg-search:focus{border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.wg-body{flex:1;min-height:0;overflow:auto;padding:6px 10px 20px}
.wg-day{position:sticky;top:0;z-index:2;padding:8px 0 6px;font-size:11px;font-weight:600;letter-spacing:.03em;color:var(--dsw-alias-label-secondary,#9aa0a6);background:linear-gradient(var(--dsw-alias-bg-base,#14161a) 70%,transparent)}
.wg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
.wg-card{position:relative;border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.09));cursor:pointer;aspect-ratio:1/1;transition:transform .12s ease,border-color .12s ease}
.wg-card:hover{transform:translateY(-2px);border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.wg-card img,.wg-card video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.wg-play{position:absolute;right:5px;bottom:5px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.wg-name{position:absolute;left:0;right:0;bottom:0;padding:12px 6px 4px;font-size:10.5px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.72));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .12s}
.wg-card:hover .wg-name{opacity:1}
.wg-empty{padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px;line-height:1.9}
.wg-err{color:#e5484d}
.wg-light{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.86);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px}
.wg-light-media{max-width:min(92vw,1400px);max-height:78vh;object-fit:contain;border-radius:8px;box-shadow:0 12px 60px rgba(0,0,0,.6)}
.wg-light-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;color:#e9e9e9;font-size:12px}
.wg-light-path{max-width:min(86vw,900px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9aa0a6;font-size:11px}
.wg-light .wg-btn{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#fff}
.wg-loading{padding:30px;text-align:center;color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px}
`

    function GalleryIcon(props) {
      const size = (props && props.size) || 16
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
        h('circle', { cx: 8.5, cy: 9.5, r: 1.6 }),
        h('path', { d: 'M21 16l-5.5-5.5L9 17' }),
      )
    }

    function fmtSize(bytes) {
      if (!bytes && bytes !== 0) return ''
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    }

    function dayKey(ts) {
      const d = new Date(ts)
      const today = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      const todayKey = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
      const y = new Date(today.getTime() - 86400000)
      const yKey = y.getFullYear() + '-' + pad(y.getMonth() + 1) + '-' + pad(y.getDate())
      if (key === todayKey) return L.today + ' · ' + key
      if (key === yKey) return L.yesterday + ' · ' + key
      return key
    }

    function useList() {
      const [state, setState] = React.useState({ status: 'loading', items: [], error: '', total: 0 })
      const load = React.useCallback(() => {
        setState((s) => ({ ...s, status: 'loading', error: '' }))
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        const timer = controller ? setTimeout(() => controller.abort(), 30000) : 0
        fetch(API + '/api/list', controller ? { signal: controller.signal } : undefined)
          .then((r) => {
            if (!r.ok) throw new Error(L.http(r.status))
            return r.json()
          })
          .then((res) => {
            if (!res || !res.ok) throw new Error((res && res.error) || L.badResponse)
            setState({ status: 'ready', items: res.items || [], error: '', total: res.total || (res.items || []).length })
          })
          .catch((error) => {
            const msg = error && error.name === 'AbortError' ? L.timeout : String((error && error.message) || error)
            setState((s) => ({ ...s, status: 'error', error: msg }))
          })
          .finally(() => { if (timer) clearTimeout(timer) })
      }, [])
      React.useEffect(() => { load() }, [load])
      return [state, load]
    }

    function Card(props) {
      const item = props.item
      const common = {
        onClick: () => props.onOpen(item),
        title: item.name + '\n' + fmtSize(item.size),
        className: 'wg-card',
      }
      const media = item.kind === 'video'
        ? h('video', { src: item.url, muted: true, preload: 'metadata', playsInline: true })
        : h('img', { src: item.url, loading: 'lazy', alt: item.name })
      return h(
        'div',
        common,
        media,
        item.kind === 'video' ? h('div', { className: 'wg-play' }, '▶') : null,
        h('div', { className: 'wg-name' }, item.name),
      )
    }

    function Lightbox(props) {
      const item = props.item
      const [copied, setCopied] = React.useState(false)
      React.useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') props.onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [props.onClose])
      const reveal = () => { fetch(API + '/api/reveal?path=' + encodeURIComponent(item.path)).catch(() => {}) }
      const copy = () => {
        try {
          navigator.clipboard.writeText(item.path).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        } catch (e) { /* clipboard unavailable — ignore */ }
      }
      const media = item.kind === 'video'
        ? h('video', { className: 'wg-light-media', src: item.url, controls: true, autoPlay: true, playsInline: true })
        : h('img', { className: 'wg-light-media', src: item.url, alt: item.name })
      return h(
        'div',
        {
          className: 'wg-light',
          onClick: (e) => { if (e.target === e.currentTarget) props.onClose() },
        },
        media,
        h(
          'div',
          { className: 'wg-light-bar' },
          h('strong', null, item.name),
          h('span', null, fmtSize(item.size)),
          h('span', null, new Date(item.mtime).toLocaleString()),
          h('button', { className: 'wg-btn', onClick: reveal }, L.reveal),
          h('button', { className: 'wg-btn', onClick: copy }, copied ? L.copied : L.copy),
          h('button', { className: 'wg-btn', onClick: props.onClose }, L.close),
        ),
        h('div', { className: 'wg-light-path' }, item.path),
      )
    }

    function Panel() {
      const [list, reload] = useList()
      const [filter, setFilter] = React.useState('all')
      const [query, setQuery] = React.useState('')
      const [open, setOpen] = React.useState(null)

      const items = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        return list.items.filter((it) => {
          if (filter !== 'all' && it.kind !== filter) return false
          if (!q) return true
          return it.name.toLowerCase().includes(q) || it.rel.toLowerCase().includes(q)
        })
      }, [list.items, filter, query])

      const groups = React.useMemo(() => {
        const out = []
        let current = null
        for (const it of items) {
          const key = dayKey(it.mtime)
          if (!current || current.key !== key) {
            current = { key, items: [] }
            out.push(current)
          }
          current.items.push(it)
        }
        return out
      }, [items])

      const images = list.items.filter((i) => i.kind === 'image').length
      const videos = list.items.length - images

      return h(
        'div',
        { className: 'wg-root' },
        h(
          'div',
          { className: 'wg-bar' },
          h('span', { className: 'wg-count' }, list.status === 'loading' ? L.scanning : L.counts(images, videos)),
          h(
            'div',
            { className: 'wg-seg' },
            h('button', { className: filter === 'all' ? 'on' : '', onClick: () => setFilter('all') }, L.all),
            h('button', { className: filter === 'image' ? 'on' : '', onClick: () => setFilter('image') }, L.images),
            h('button', { className: filter === 'video' ? 'on' : '', onClick: () => setFilter('video') }, L.videos),
          ),
          h('input', {
            className: 'wg-search',
            placeholder: L.search,
            value: query,
            onChange: (e) => setQuery(e.target.value),
          }),
          h('button', { className: 'wg-btn', onClick: reload, title: L.refreshTitle }, L.refresh),
        ),
        h(
          'div',
          { className: 'wg-body' },
          list.status === 'loading' && !list.items.length ? h('div', { className: 'wg-loading' }, L.loading) : null,
          list.status === 'error' ? h('div', { className: 'wg-empty wg-err' }, L.failed + list.error) : null,
          list.status !== 'loading' && !list.status.startsWith('error') && !items.length
            ? h('div', { className: 'wg-empty' }, L.emptyTitle, h('br'), L.emptyHint)
            : null,
          groups.map((g) =>
            h(
              'div',
              { key: g.key },
              h('div', { className: 'wg-day' }, g.key + ' · ' + g.items.length),
              h('div', { className: 'wg-grid' }, g.items.map((it) => h(Card, { key: it.path, item: it, onOpen: setOpen }))),
            ),
          ),
        ),
        open ? h(Lightbox, { item: open, onClose: () => setOpen(null) }) : null,
      )
    }

    function TabTitle() {
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, h(GalleryIcon, { size: 13 }), L.tab)
    }

    const inject = ['slots']

    function mountStyles() {
      try {
        if (typeof document === 'undefined' || !document.head) return () => {}
        const el = document.createElement('style')
        el.setAttribute('data-owner', 'dsh-works-gallery')
        el.textContent = CSS
        document.head.appendChild(el)
        return () => { try { el.remove() } catch (e) { /* already detached */ } }
      } catch (e) { return () => {} }
    }

    function apply(ctx) {
      const disposers = [mountStyles()]
      const own = (d) => { if (typeof d === 'function') disposers.push(d) }

      if (typeof ctx.inject === 'function') {
        own(ctx.inject(['sidebarRightTabs'], (scoped) => {
          const tabs = scoped && (scoped.sidebarRightTabs || (typeof scoped.get === 'function' ? scoped.get('sidebarRightTabs') : null))
          if (!tabs || typeof tabs.register !== 'function') return () => {}
          own(tabs.register({
            id: TAB_ID,
            kind: TAB_KIND,
            priority: 'extension',
            title: () => L.tab,
            guide: [{
              id: 'works-gallery',
              order: 35,
              title: () => L.guide,
              description: () => L.guideDesc,
              icon: GalleryIcon,
            }],
          }))
          const slots = scoped && scoped.slots
          if (slots && typeof slots.register === 'function') {
            own(slots.inject('sidebar.right.pane.tab', () => slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID }, Panel)))
            own(slots.inject('sidebar.right.pane.tab.title', () => slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, TabTitle)))
          }
          return () => {}
        }))
      }

      return () => {
        while (disposers.length) {
          const d = disposers.pop()
          try { d() } catch (e) { /* never throw while unmounting */ }
        }
      }
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = 'dsh-works-gallery-client'
    return module.exports
  },
})
