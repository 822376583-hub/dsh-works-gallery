# dsh-works-gallery 作品库

[English](README.md) · **中文**

一个挂在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 右侧栏的「作品库」：
把你在工作区里生成过的**图片和视频**按时间倒序铺成缩略图墙，不用再翻聊天记录找上周做的海报。

<img src="icon.png" width="96" alt="作品库 icon">

## 它做什么

- **只扫描，不建索引。** 每次打开（或点刷新、10 秒缓存过期）就遍历工作区，列出
  `.png .jpg .jpeg .webp .gif .avif .bmp .svg .mp4 .webm .mov .m4v .mkv` 文件。
- **最新的在最前**，按天分组：`今天`、`昨天`，再往后是具体日期。
- **缩略图墙**：图片懒加载，视频显示静音首帧 + 播放角标。
- **点开看大图/直接播**：全屏灯箱，图片按原尺寸显示，视频带控制条、可拖进度条
  （文件路由支持 `Range`，所以能随意拖动）。
- **筛选**：全部 / 图片 / 视频，外加按文件名和相对路径搜索。
- **在文件夹中显示**、**复制路径**，灯箱里一键完成。
- **纯只读**：不写入、不移动、不删除任何文件，两个写操作都没有。

## 文件从哪来

默认扫描 DSH 存放工作区的目录：

| 系统 | 默认根目录 |
| --- | --- |
| Windows | `%USERPROFILE%\Documents\deepseek-harness` |
| macOS / Linux | `~/Documents/deepseek-harness` |

该目录不存在时回退到 `~/Documents`。也可以用环境变量 `DSH_WORKS_GALLERY_ROOTS` 指定，
多个根目录之间 Windows 用 `;` 分隔、其它系统用 `:`：

```powershell
# Windows (PowerShell)
$env:DSH_WORKS_GALLERY_ROOTS = "D:\renders;D:\screenshots"
```

```bash
# macOS / Linux
export DSH_WORKS_GALLERY_ROOTS="$HOME/renders:$HOME/screenshots"
```

每次 `/file`、`/api/reveal` 请求都会在**解析软链接之后**比对根目录，所以根目录里的软链
不能把请求带到根目录外；且只允许媒体扩展名。

## 安装

在 DSH 插件市场搜「作品库 / works gallery」安装，然后重启 DSH。

手动安装：把本仓库放进 profile 的 `node_modules`，再把包名加进 profile `package.json` 的
`dsh.profile.bundles`：

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

Host 半边的路由会在 bundle 列表重新加载时热生效；右侧栏的标签需要刷新一次页面
（或重启 DSH）才会出现。

## 从哪打开

右侧栏 →「**引导**」页 → 点「**作品库**」胶囊。打开后它会作为独立标签留在右侧栏标签栏里。

## HTTP 路由

全部在 `/dsh-works-gallery` 下，全部只读：

| 路由 | 用途 |
| --- | --- |
| `GET /api/list` | `{ ok, roots, total, truncated, items[] }`，按修改时间倒序，上限 5000 条 / 深度 8 |
| `GET /file?path=…` | 输出单个媒体文件，支持 `Range`（206），视频可拖进度 |
| `GET /api/reveal?path=…` | 在资源管理器 / Finder / 桌面文件管理器里定位该文件 |

扫描时跳过：`node_modules`、`.git`、`.cache`、`dist`、`venv`、`__pycache__`、点目录等依赖和构建目录。

## 依赖

- 带右侧栏的 DeepSeek Harness（`@deepseek-ai/dsh-client-ui-sidebar-right`）
- Node.js >= 20

## 许可

MIT © Wang Youqing
