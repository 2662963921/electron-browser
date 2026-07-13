# Electron WebView 浏览器

基于 Electron 28 的轻量级无边框网页浏览器，支持自定义快捷键、鼠标组合键、书签管理、透明背景、夜间模式等功能。

## 功能特点

- **无边框窗口** — 自定义标题栏和窗口控件（最小化/最大化/关闭）
- **快捷键自定义** — 键盘和鼠标快捷键均可自由录制，支持鼠标组合键（如中键+左键）
- **书签管理** — 添加/删除/查看书签
- **透明背景** — 无边框+全透明模式，可穿透显示桌面
- **夜间模式** — 一键切换明暗主题
- **窗口置顶** — 始终显示在最前面
- **开发者工具箱** — F12 打开/关闭开发者工具
- **控件隐藏** — F11 隐藏标题栏和工具栏，沉浸式浏览
- **鼠标侧键** — XButton1/XButton2 前进/后退
- **Shift+Space 上翻** — 按一屏高度向上滚动（替代 PageUp）
<img width="1340" height="1090" alt="b9325334-274c-4b55-a88d-842e3601836a" src="https://github.com/user-attachments/assets/bda8214e-35a1-4592-b574-805313e69d26" />
<img width="1340" height="1090" alt="2831edc0-ad36-459c-ab61-683e1f1c875f" src="https://github.com/user-attachments/assets/15e26ba8-9bec-4248-ac4f-516528386002" />

## 技术栈

- **Electron 28.3.3** — 跨平台桌面框架
- **无前端框架** — 纯 HTML/CSS/JS，零依赖
- **`<webview>` 标签** — 内嵌网页容器
- **SVG 图标** — Feather-style 矢量图标，自适应主题色

## 快速开始

```bash
# 安装依赖
npm install

# 开发启动
npm start

# 构建便携版（单 exe 文件）
npm run build

# 构建安装版（推荐，启动更快）
npm run build:install

# 快速重打包（修改源码后复用已解压的运行环境）
npm run build:fast          # 便携版快速重打包
npm run build:install:fast  # 安装版快速重打包
```

构建产物在 `dist/` 目录下。

## 快捷键

### 系统默认

| 快捷键 | 功能 |
|--------|------|
| F12 | 打开/关闭开发者工具箱 |
| F11 | 隐藏/显示窗口控件（沉浸模式） |
| Ctrl+Shift+I | 已禁用（避免与 F12 冲突） |
| Alt+F4 | 关闭窗口（Windows 系统级） |

### 可自定义（设置面板中录制）

| 动作 | 默认键盘 | 说明 |
|------|---------|------|
| 关闭窗口 | Alt+F4 | — |
| 切换夜间/日间模式 | Ctrl+D | — |
| 隐藏/显示控件 | F11 | F11 始终有效，不受自定义影响 |
| 窗口置顶 | Ctrl+Shift+T | — |

鼠标快捷键支持单键和组合键（如中键+左键、中键+右键等）。侧键（XButton1/XButton2）默认为前进/后退。

## 目录结构

```
.
├── main.js          # 主进程（窗口管理、IPC、快捷键、进程清理）
├── preload.js       # 预加载脚本（contextBridge 安全暴露 API）
├── index.html       # 渲染进程（完整 UI + CSS + JS）
├── error.html       # 错误页面模板
├── package.json     # 依赖和构建配置
├── start.bat        # Windows 启动脚本（处理 ELECTRON_RUN_AS_NODE）
└── start.js         # 开发启动助手
```

## 配置

用户配置存储在 `%APPDATA%/WebView 浏览器/browser-config.json`，包含：
- 窗口位置/大小/最大化状态
- 快捷键映射
- 书签列表
- 主题/透明度/置顶等设置

## 构建说明

构建命令中的镜像源已配置为国内镜像（`npmmirror.com`），无需额外设置。

```bash
npm run build           # → dist/WebView 浏览器 1.0.0.exe（便携版）
npm run build:install   # → dist/WebView 浏览器 Setup 1.0.0.exe（安装版）
```

安装版只需 `Setup*.exe` 一个文件即可分发，安装后启动速度比便携版快 3-5 秒。
