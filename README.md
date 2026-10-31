# dsh-works-gallery 作品库

**English** · [中文](README.zh.md)

A right-sidebar tab for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that shows
**every image and video made in your workspaces**, newest first, as a thumbnail wall. No more
scrolling back through old chats to find the poster you generated last week.

<img src="icon.png" width="96" alt="作品库 icon">

## What it does

- **Scans, does not index.** Walks the workspace roots on request (10 s cache) and lists every
  `.png .jpg .jpeg .webp .gif .avif .bmp .svg .mp4 .webm .mov .m4v .mkv` file it finds.
- **Newest first, grouped by day** — `Today`, `Yesterday`, then plain dates.
- **Thumbnail wall** — images lazy-load, videos show a muted first frame with a play badge.
- **Click to open** a full-screen lightbox: images at full size, videos with controls and seeking
  (the file route speaks `Range`, so scrubbing works).
- **Filters** — All / Images / Videos, plus a file-name search across path and name.
- **Show in folder** and **copy path** straight from the lightbox.
- **Tidy up without fear.** Hit **Select**, tick any number of thumbnails, and **Delete** moves them
  to the OS recycle bin — one click restores them from there. Non-media files, and anything outside
  the roots, is refused by the host.
- **Read-only by default.** Only the delete route touches the disk, and only for the files you
  ticked that live under a root.

## Where the files come from

By default it scans the directory DSH keeps its workspaces in:

| OS | Default root |
| --- | --- |
| Windows | `%USERPROFILE%\Documents\deepseek-harness` |
| macOS / Linux | `~/Documents/deepseek-harness` |

If that directory does not exist it falls back to `~/Documents`. Override with
`DSH_WORKS_GALLERY_ROOTS` — several roots separated by `;` on Windows and `:` elsewhere:

```bash
# Windows (PowerShell)
$env:DSH_WORKS_GALLERY_ROOTS = "D:\renders;D:\screenshots"
# macOS / Linux
export DSH_WORKS_GALLERY_ROOTS="$HOME/renders:$HOME/screenshots"
```

Every `/file` and `/api/reveal` request is checked against those roots **after resolving symlinks**,
so a link inside a root cannot be used to read something outside it. Only media extensions are served.

## Install

From the DSH plugin market: search **作品库 / works gallery** and install, then restart DSH.

Manually: copy this repository into your profile's `node_modules`, and add the package name to
`dsh.profile.bundles` in the profile's `package.json`:

```jsonc
// ~/.dsh/profiles/<profile>/package.json
{
  "dsh": {
    "profile": {
      "bundles": ["dsh-works-gallery"]
    }
  }
}
```

The Host half's routes are hot-applied on the next bundle-list reload; the sidebar tab appears
after a page refresh (or a DSH restart).

## Open it

Right sidebar → **Guidance / 引导** tab → the **Gallery / 作品库** capsule. In the right sidebar's
tab bar it stays available as its own tab afterwards.

## HTTP routes

All under `/dsh-works-gallery`. Only the last one touches the disk:

| Route | Purpose |
| --- | --- |
| `GET /api/list` | `{ ok, roots, total, truncated, items[] }`, newest first, capped at 5000 entries / depth 8 |
| `GET /file?path=…` | Streams one media file; supports `Range` (206) so video seeking works |
| `GET /api/reveal?path=…` | Reveals the file in Explorer / Finder / the desktop file manager |
| `POST /api/delete` | `{ paths: [...] }` (max 300) → moves each file to the OS recycle bin. Returns `{ ok, deleted[], failed[{path,error}] }`; paths outside the roots, or without a media extension, are refused |

Skipped while scanning: `node_modules`, `.git`, `.cache`, `dist`, `venv`, `__pycache__`, dot-directories
and other dependency/build folders.

## Requirements

- DeepSeek Harness with the right sidebar (`@deepseek-ai/dsh-client-ui-sidebar-right`)
- Node.js >= 20

## License

MIT © Wang Youqing
